import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import AceEditor from 'react-ace';
import ace from 'brace';
import Completer from 'models/completer';

import 'brace/ext/language_tools';
import 'brace/mode/json';
import 'brace/theme/github';

/**
 * Options for the ACE editor.
 */
const OPTIONS = {
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  tabSize: 2,
  fontSize: 12,
  showGutter: false
};

/**
 * Edit a single stage in the aggregation pipeline.
 */
class StageEditor extends PureComponent {
  static displayName = 'StageEditorComponent';

  static propTypes = {
    stage: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    onStageChange: PropTypes.func.isRequired
  }

  componentDidMount() {
    if (!this.langTools) {
      this.langTools = ace.acequire('ace/ext/language_tools');
      this.langTools.addCompleter(new Completer());
    }
  }

  render() {
    return (
      <AceEditor
        mode="json"
        theme="github"
        value={this.props.stage}
        onChange={this.props.onStageChange}
        name={`aggregations-stage-editor-${this.props.index}`}
        setOptions={OPTIONS} />
    );
  }
}

export default StageEditor;
export { StageEditor };
