import React from 'react';
import { expect } from 'chai';
import sinon from 'sinon';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkUpdateModal from './bulk-update-modal';

function renderBulkUpdateModal(
  props?: Partial<React.ComponentProps<typeof BulkUpdateModal>>
) {
  return render(
    <BulkUpdateModal
      isOpen={true}
      ns="mydb.mycoll"
      filter={{ a: 1 }}
      count={0}
      updateText="{ $set: {} }"
      preview={{
        changes: [
          {
            before: { foo: 1 },
            after: { foo: 1 },
          },
        ],
      }}
      enablePreview={true}
      closeBulkUpdateModal={() => {}}
      updateBulkUpdatePreview={() => {}}
      runBulkUpdate={() => {}}
      saveUpdateQuery={() => {}}
      {...props}
    />
  );
}

describe('BulkUpdateModal Component', function () {
  afterEach(function () {
    cleanup();
  });

  it('does not render if closed', function () {
    renderBulkUpdateModal({ isOpen: false });
    expect(screen.queryByText(/Update/)).to.not.exist;
  });

  it('renders if open', function () {
    renderBulkUpdateModal({ count: 42 });

    expect(screen.getByTestId('modal-title').textContent).to.equal(
      'Update 42 documents'
    );

    // filter
    expect(screen.getByTestId('readonly-filter').textContent).to.equal(
      '{\n  a: 1\n}'
    );

    // update
    expect(screen.getByTestId('bulk-update-update').textContent).to.match(
      /{ \$set: {} }/
    );

    // preview
    expect(
      screen.getAllByTestId('bulk-update-preview-document')
    ).to.have.lengthOf(1);

    // buttons
    expect(screen.getByRole('button', { name: 'Cancel' })).to.exist;
    expect(screen.getByRole('button', { name: 'Update 42 documents' })).to
      .exist;
  });

  it('hides document count if count is N/A', function () {
    renderBulkUpdateModal({ count: undefined });

    expect(screen.getByTestId('modal-title').textContent).to.equal(
      'Update documents'
    );

    expect(screen.getByRole('button', { name: 'Update documents' })).to.exist;
  });

  it('use singular if count is 1', function () {
    renderBulkUpdateModal({ count: 1 });
    expect(screen.getByTestId('modal-title').textContent).to.equal(
      'Update 1 document'
    );

    expect(screen.getByRole('button', { name: 'Update 1 document' })).to.exist;
  });

  it('renders the empty state if the count is 0', function () {
    renderBulkUpdateModal({ count: 0 });
    expect(screen.getByTestId('bulk-update-preview-empty-state')).to.exist;
  });

  it('resets if the modal is re-opened', async function () {
    // initial open
    const { rerender } = renderBulkUpdateModal({ isOpen: true });

    // close
    rerender(
      <BulkUpdateModal
        isOpen={false}
        ns="mydb.mycoll"
        filter={{ a: 1 }}
        count={0}
        updateText="{ $set: {} }"
        preview={{
          changes: [
            {
              before: {},
              after: {},
            },
          ],
        }}
        closeBulkUpdateModal={() => {}}
        updateBulkUpdatePreview={() => {}}
        runBulkUpdate={() => {}}
        saveUpdateQuery={() => {}}
      />
    );

    // re-open
    rerender(
      <BulkUpdateModal
        isOpen={true}
        ns="mydb.mycoll"
        filter={{ a: 1 }}
        count={0}
        updateText="foo"
        preview={{
          changes: [
            {
              before: {},
              after: {},
            },
          ],
        }}
        closeBulkUpdateModal={() => {}}
        updateBulkUpdatePreview={() => {}}
        runBulkUpdate={() => {}}
        saveUpdateQuery={() => {}}
      />
    );

    await waitFor(() => {
      expect(
        screen
          .getByTestId('bulk-update-update')
          .getElementsByClassName('cm-content')[0].textContent
      ).to.equal('foo');
    });
  });

  it('closes the modal when the close button is clicked', function () {
    const onCloseSpy = sinon.spy();
    renderBulkUpdateModal({ closeBulkUpdateModal: onCloseSpy });

    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseSpy).to.have.been.calledOnce;
  });

  it('runs the update when the update button is clicked (preview supported)', function () {
    const onUpdateSpy = sinon.spy();
    renderBulkUpdateModal({
      enablePreview: true,
      runBulkUpdate: onUpdateSpy,
      count: 60,
    });

    // has a preview
    expect(
      screen.getAllByTestId('bulk-update-preview-document')
    ).to.have.lengthOf(1);

    userEvent.click(
      screen.getByRole('button', { name: 'Update 60 documents' })
    );
    expect(onUpdateSpy).to.have.been.calledOnce;
  });

  it('runs the update when the update button is clicked (preview unsupported)', function () {
    const onUpdateSpy = sinon.spy();
    renderBulkUpdateModal({
      enablePreview: false,
      runBulkUpdate: onUpdateSpy,
      count: 60,
    });

    // does not render a preview
    expect(
      screen.queryAllByTestId('bulk-update-preview-document')
    ).to.have.lengthOf(0);

    userEvent.click(
      screen.getByRole('button', { name: 'Update 60 documents' })
    );
    expect(onUpdateSpy).to.have.been.calledOnce;
  });

  it('saves the query when a name is provided', function () {
    const saveUpdateQuerySpy = sinon.spy();
    renderBulkUpdateModal({ saveUpdateQuery: saveUpdateQuerySpy });

    userEvent.click(screen.getByTestId('inline-save-query-modal-opener'));
    userEvent.type(
      screen.getByTestId('inline-save-query-modal-input'),
      'MySavedQuery'
    );

    userEvent.click(screen.getByTestId('inline-save-query-modal-submit'));
    expect(saveUpdateQuerySpy).to.have.been.calledOnceWith('MySavedQuery');
  });
});
