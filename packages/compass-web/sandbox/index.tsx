import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  resetGlobalCSS,
  css,
  ErrorBoundary,
  Body,
} from '@mongodb-js/compass-components';

import createDebug from 'debug';
import { CompassWeb } from '../src/index';
import type { OpenWorkspaceOptions } from '@mongodb-js/compass-workspaces';

import { LoggerAndTelemetryProvider } from '@mongodb-js/compass-logging/provider';
import { mongoLogId } from '@mongodb-js/compass-logging';
import type { LoggerAndTelemetry } from '@mongodb-js/compass-logging';
import type { MongoLogWriter } from 'mongodb-log-writer';

const sandboxContainerStyles = css({
  width: '100%',
  height: '100%',
});

resetGlobalCSS();

const tracking: { event: string; properties: any }[] = [];
const logging: { name: string; component: string; args: any[] }[] = [];

(globalThis as any).tracking = tracking;
(globalThis as any).logging = logging;

const App = () => {
  const [initialTab] = useState<OpenWorkspaceOptions>(() => {
    const [, tab, namespace = ''] = window.location.pathname.split('/');
    if (tab === 'databases') {
      return { type: 'Databases' };
    }
    if (tab === 'collections' && namespace) {
      return { type: 'Collections', namespace };
    }
    if (tab === 'collection' && namespace) {
      return { type: 'Collection', namespace };
    }
    return { type: 'Databases' };
  });

  const loggerProvider = useRef({
    createLogger: (component = 'SANDBOX-LOGGER'): LoggerAndTelemetry => {
      const logger = (name: 'debug' | 'info' | 'warn' | 'error' | 'fatal') => {
        return (...args: any[]) => {
          logging.push({ name, component, args });
        };
      };

      const track = (event: string, properties: any) => {
        tracking.push({ event, properties });
      };

      const debug = createDebug(`mongodb-compass:${component.toLowerCase()}`);

      return {
        log: {
          component,
          get unbound() {
            return this as unknown as MongoLogWriter;
          },
          write: () => true,
          debug: logger('debug'),
          info: logger('info'),
          warn: logger('warn'),
          error: logger('error'),
          fatal: logger('fatal'),
        },
        debug,
        track,
        mongoLogId,
      };
    },
  });

  return (
    <Body as="div" className={sandboxContainerStyles}>
      <LoggerAndTelemetryProvider value={loggerProvider.current}>
        <ErrorBoundary>
          <CompassWeb
            connectionString='mongodb://root:nftgo2021@10.5.1.76:27017/nftgo-prod-master-3?authSource=admin&readPreference=secondaryPreferred'
            initialWorkspaceTabs={[initialTab]}
            onActiveWorkspaceTabChange={(tab) => {
              let newPath: string;
              switch (tab?.type) {
                case 'Databases':
                  newPath = '/databases';
                  break;
                case 'Collections':
                  newPath = `/collections/${tab.namespace}`;
                  break;
                case 'Collection':
                  newPath = `/collection/${tab.namespace}`;
                  break;
                default:
                  newPath = '/';
              }
              if (newPath) {
                window.history.replaceState(null, '', newPath);
              }
            }}
          ></CompassWeb>
        </ErrorBoundary>
      </LoggerAndTelemetryProvider>
    </Body>
  );
};

ReactDOM.render(<App></App>, document.querySelector('#sandbox-app'));
