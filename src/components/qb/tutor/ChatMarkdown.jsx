import ReactMarkdown from 'react-markdown';

export function ChatMarkdown({ text }) {
  return (
    <div style={{ overflowWrap: 'anywhere' }}>
      <ReactMarkdown skipHtml disallowedElements={['img']}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
