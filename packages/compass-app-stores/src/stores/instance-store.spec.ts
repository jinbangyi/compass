import { EventEmitter } from 'events';
import AppRegistry, { createActivateHelpers } from 'hadron-app-registry';
import { createInstanceStore } from './instance-store';
import sinon from 'sinon';
import { expect } from 'chai';
import { createNoopLoggerAndTelemetry } from '@mongodb-js/compass-logging/provider';
import type { MongoDBInstance } from 'mongodb-instance-model';

class FakeDataService extends EventEmitter {
  instanceInfo: any;
  getConnectionString() {
    return { hosts: ['localhost:27020'] };
  }
  instance() {
    return Promise.resolve(this.instanceInfo);
  }
  listDatabases() {
    return Promise.resolve([{ _id: 'foo' }]);
  }
  databaseStats() {
    return Promise.resolve({});
  }
  listCollections() {
    return Promise.resolve([{ _id: 'foo.bar' }, { _id: 'foo.buz' }]);
  }
  getLastSeenTopology() {
    return {
      type: 'Unknown',
      servers: [],
      setName: 'foo',
    };
  }
}

function createDataService(
  instanceInfo: any = { build: { version: '1.2.3' }, host: { arch: 'x64' } }
): any {
  const dataService = new FakeDataService();
  dataService.instanceInfo = instanceInfo;
  return dataService;
}

describe('InstanceStore [Store]', function () {
  let globalAppRegistry: AppRegistry;
  let dataService: any;
  let store: ReturnType<typeof createInstanceStore>;
  let instance: MongoDBInstance;

  let initialInstanceRefreshedPromise: Promise<unknown>;
  let sandbox: sinon.SinonSandbox;

  function waitForInstanceRefresh(): Promise<void> {
    return new Promise((resolve) => {
      if (instance.refreshingStatus === 'ready') {
        resolve();
      }
      instance.on('change:refreshingStatus', () => {
        if (instance.refreshingStatus === 'ready') {
          resolve();
        }
      });
    });
  }

  beforeEach(function () {
    globalAppRegistry = new AppRegistry();
    sandbox = sinon.createSandbox();

    dataService = createDataService();
    const logger = createNoopLoggerAndTelemetry();

    store = createInstanceStore(
      {
        dataService,
        globalAppRegistry,
        logger,
      },
      createActivateHelpers()
    );
    instance = store.state.instance;

    initialInstanceRefreshedPromise = waitForInstanceRefresh();
  });

  afterEach(function () {
    sandbox.restore();
    store.deactivate();
  });

  context('on refresh data', function () {
    beforeEach(async function () {
      sandbox
        .stub(dataService, 'instance')
        .returns({ build: { version: '3.2.1' } });
      await initialInstanceRefreshedPromise;
      expect(store.getState().instance).to.have.nested.property(
        'build.version',
        '1.2.3'
      );
      globalAppRegistry.emit('refresh-data');
      await waitForInstanceRefresh();
    });

    it('calls instance model fetch', function () {
      expect(instance).to.have.nested.property('build.version', '3.2.1');
    });
  });

  context('when instance ready', function () {
    beforeEach(async function () {
      await initialInstanceRefreshedPromise;
      await Promise.all(
        instance.databases.map((db) => {
          return db.fetchCollections({ dataService });
        })
      );
      expect(instance.databases).to.have.lengthOf(1);
      expect(instance.databases.get('foo')).to.exist;
      expect(
        instance.databases.get('foo')?.collections.get('foo.bar', '_id')
      ).to.exist;
      expect(
        instance.databases.get('foo')?.collections.get('foo.buz', '_id')
      ).to.exist;
    });

    context(`on 'collection-dropped' event`, function () {
      it('should remove collection from the database collections', function () {
        globalAppRegistry.emit('collection-dropped', 'foo.bar');
        expect(
          instance.databases.get('foo')?.collections.get('foo.bar')
        ).not.to.exist;
      });

      it('should remove all listeners from the collection', function () {
        const coll = instance.databases
          .get('foo')
          ?.collections.get('foo.bar', '_id');
        coll?.on('change', () => {});
        expect((coll as any)._events.change).to.have.lengthOf(1);
        globalAppRegistry.emit('collection-dropped', 'foo.bar');
        expect((coll as any)._events).to.not.exist;
      });

      it('should remove database if last collection was removed', function () {
        globalAppRegistry.emit('collection-dropped', 'foo.bar');
        globalAppRegistry.emit('collection-dropped', 'foo.buz');
        expect(instance.databases).to.have.lengthOf(0);
        expect(instance.databases.get('foo')).not.to.exist;
      });
    });

    context(`on 'database-dropped' event`, function () {
      it('should remove database from instance databases', function () {
        globalAppRegistry.emit('database-dropped', 'foo');
        expect(instance.databases).to.have.lengthOf(0);
        expect(instance.databases.get('foo')).not.to.exist;
      });

      it('should remove all listeners from the database', function () {
        const db = instance.databases.get('foo');
        db?.on('change', () => {});
        expect((db as any)._events.change).to.have.lengthOf(1);
        globalAppRegistry.emit('database-dropped', 'foo');
        expect((db as any)._events).to.not.exist;
      });
    });

    const createdEvents = [
      'collection-created',
      'view-created',
      'agg-pipeline-out-executed',
    ];

    for (const evt of createdEvents) {
      context(`on '${evt}' event`, function () {
        it('should add collection to the databases collections', function () {
          globalAppRegistry.emit(evt, 'foo.qux');
          expect(instance.databases.get('foo')?.collections).to.have.lengthOf(
            3
          );
          expect(
            instance.databases.get('foo')?.collections.get('foo.qux', '_id')
          ).to.exist;
        });

        it("should add new database and add collection to its collections if database doesn't exist yet", function () {
          globalAppRegistry.emit(evt, 'bar.qux');
          expect(instance.databases).to.have.lengthOf(2);
          expect(instance.databases.get('bar')).to.exist;
          expect(instance.databases.get('bar')?.collections).to.have.lengthOf(
            1
          );
          expect(
            instance.databases.get('bar')?.collections.get('bar.qux')
          ).to.exist;
        });
      });
    }

    context(`on 'collection-renamed' event`, function () {
      it('should update collection _id', function () {
        globalAppRegistry.emit('collection-renamed', {
          from: 'foo.bar',
          to: 'foo.qux',
        });
        expect(instance.databases.get('foo')?.collections).to.have.lengthOf(2);
        expect(
          instance.databases.get('foo')?.collections.get('foo.bar', '_id')
        ).to.not.exist;
        expect(
          instance.databases.get('foo')?.collections.get('foo.qux', '_id')
        ).to.exist;
      });
    });
  });
});
