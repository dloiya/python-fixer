import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Button, Card, Modal, Toast, ToastContainer } from 'react-bootstrap';
import { Editor } from '@monaco-editor/react';
import { PlayFill, Magic, CodeSlash, SendFill } from 'react-bootstrap-icons';
import axios from 'axios';

const PythonSandbox = () => {
  const [code, setCode] = useState(`# Welcome to Python Sandbox
def hello_world():
    print("Hello, Sandbox World!")

hello_world()`);
  const [output, setOutput] = useState('');
  const [isError, setIsError] = useState(false);
  const [activePanel, setActivePanel] = useState('editor');
  const [consoleHistory, setConsoleHistory] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const terminalInputRef = useRef(null);

  const handleCodeRun = useCallback(async () => {
    try {
      setIsError(false);
      const response = await axios.post('http://localhost:5000/api/run', { code });
      const outputResult = response.data.output || 'No output';
      setOutput(outputResult);

      setConsoleHistory((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          content: outputResult,
          type: response.data.error ? 'error' : 'output',
        },
      ]);

      setIsError(!!response.data.error);
      setShowOutputModal(true);
    } catch (error) {
      setIsError(true);
      setOutput(`Execution error: ${error.message}`);
      setShowOutputModal(true);
    }
  }, [code]);

  const handleGetSuggestions = useCallback(async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/suggest', { code });
      setSuggestion(response.data.suggestion);

      setToast({ show: true, message: 'AI suggestions generated', type: 'info' });
    } catch (error) {
      setToast({ show: true, message: 'Failed to get suggestions', type: 'danger' });
    }
  }, [code]);

  const handleShellCommand = useCallback(async (inputCommand) => {
    if (!inputCommand.trim()) return;

    try {
      const response = await axios.post('http://localhost:5000/api/shell', { command: inputCommand });

      setConsoleHistory(prev => [
        ...prev,
        { 
          timestamp: new Date().toLocaleTimeString(),
          content: `> ${inputCommand}`,
          type: 'command'
        },
        { 
          timestamp: new Date().toLocaleTimeString(),
          content: response.data.output || 'No output',
          type: 'output'
        }
      ]);

      // Clear input after successful command
      setTerminalInput('');
      
      // Focus back on input after command
      if (terminalInputRef.current) {
        terminalInputRef.current.focus();
      }
    } catch (error) {
      setConsoleHistory(prev => [
        ...prev,
        { 
          timestamp: new Date().toLocaleTimeString(),
          content: `> ${inputCommand}`,
          type: 'command'
        },
        { 
          timestamp: new Date().toLocaleTimeString(),
          content: `Shell error: ${error.message}`,
          type: 'error'
        }
      ]);
    }
  }, []);

  const handleTerminalSubmit = (e) => {
    e.preventDefault(); // Prevent form submission
    handleShellCommand(terminalInput);
  };

  const editorOptions = useMemo(() => ({
    selectOnLineNumbers: true,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  }), []);

  const renderPanel = () => {
    switch (activePanel) {
      case 'editor':
        return (
          <Editor
            height="calc(100vh - 120px)" 
            width="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={editorOptions}
          />
        );
      case 'console':
        return (
          <div
            className="h-100 w-100 overflow-auto p-2 bg-black text-light"
            style={{
              maxHeight: '100%',
              overflowY: 'auto',
            }}
          >
            {consoleHistory.map((entry, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  entry.type === 'error' ? 'text-danger' : 
                  entry.type === 'command' ? 'text-warning' : 
                  'text-light'
                }`}
              >
                <small className="text-muted me-2">
                  [{entry.timestamp}]
                </small>
                {entry.content}
              </div>
            ))}
          </div>
        );

      case 'terminal':
        return(
          <div className="h-100 w-100 d-flex flex-column bg-black text-light p-2">
            <div 
              className="flex-grow-1 overflow-auto mb-2" 
              style={{ maxHeight: 'calc(100% - 60px)' }}
            >
              {consoleHistory.map((entry, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    entry.type === 'error' ? 'text-danger' : 
                    entry.type === 'command' ? 'text-warning' : 
                    'text-light'
                  }`}
                >
                  <small className="text-muted me-2">
                    [{entry.timestamp}]
                  </small>
                  {entry.content}
                </div>
              ))}
            </div>
            <form onSubmit={handleTerminalSubmit} className="d-flex">
              <input
                ref={terminalInputRef}
                type="text"
                className="form-control me-2"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Enter shell command"
              />
              <Button 
                variant="primary" 
                type="submit"
                size="sm"
              >
                <SendFill />
              </Button>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Container fluid className="d-flex flex-column vh-100 p-0">
      <Row className="m-0 bg-secondary py-2 align-items-center">
        <Col xs={12} md={4} className="d-flex align-items-center">
          <CodeSlash className="me-2" />
          <span className="d-none d-md-inline">Python Sandbox</span>
        </Col>
        <Col xs={12} md={8} className="d-flex justify-content-end">
          <div className="d-flex gap-2">
            <Button variant="success" size="sm" onClick={handleCodeRun}>
              <PlayFill className="me-1" /> Run
            </Button>
            <Button variant="info" size="sm" onClick={handleGetSuggestions}>
              <Magic className="me-1" /> Suggest
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="flex-grow-1 m-0">
        <Col xs={12} className="p-0 h-100">
          <Card className="flex-grow-1 border-0 rounded-0">
            <Card.Body className="p-0 d-flex flex-column">
              <div className="bg-dark d-flex" style={{ height: '40px' }}>
                <Button
                  variant={activePanel === 'editor' ? 'primary' : 'secondary'}
                  size="sm"
                  className="me-1 rounded-0"
                  onClick={() => setActivePanel('editor')}
                >
                  Editor
                </Button>
                <Button
                  variant={activePanel === 'console' ? 'primary' : 'secondary'}
                  size="sm"
                  className="me-1 rounded-0"
                  onClick={() => setActivePanel('console')}
                >
                  Console
                </Button>
                <Button
                  variant={activePanel === 'terminal' ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-0"
                  onClick={() => setActivePanel('terminal')}
                >
                  Terminal
                </Button>
              </div>

              <div
                className="flex-grow-1"
                style={{
                  height: '100%',
                  minHeight: '400px',
                  overflow: 'hidden',
                }}
              >
                {renderPanel()}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showOutputModal} onHide={() => setShowOutputModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Code Output</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre
            className={`p-3 rounded ${isError ? 'bg-danger-subtle text-danger' : 'bg-light text-dark'}`}
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {output || 'No output'}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOutputModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!suggestion} onHide={() => setSuggestion('')} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>AI Code Suggestions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre
            className="bg-light p-3 rounded"
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {suggestion}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSuggestion('')}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setCode((prev) => `${suggestion}\n\n# Previous Code\n${prev}`);
              setSuggestion('');
            }}
          >
            Apply Suggestion
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-end" className="p-3">
        <Toast
          onClose={() => setToast({ show: false, message: '', type: 'info' })}
          show={toast.show}
          delay={3000}
          autohide
          bg={toast.type}
        >
          <Toast.Header>
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body>{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default PythonSandbox;