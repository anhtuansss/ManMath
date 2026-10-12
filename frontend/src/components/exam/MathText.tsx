import katex from 'katex';

type MathTextTag = 'span' | 'p' | 'div';

type MathTextProps = {
  text: string;
  className?: string;
  as?: MathTextTag;
};

type MathSegment =
  | {
      type: 'text';
      content: string;
    }
  | {
      type: 'inlineMath' | 'blockMath';
      content: string;
    };

const findClosingDelimiter = (
  source: string,
  startIndex: number,
  delimiter: '$' | '$$',
) => {
  let searchIndex = startIndex;

  while (searchIndex < source.length) {
    const foundIndex = source.indexOf(delimiter, searchIndex);

    if (foundIndex === -1) {
      return -1;
    }

    if (source[foundIndex - 1] !== '\\') {
      return foundIndex;
    }

    searchIndex = foundIndex + delimiter.length;
  }

  return -1;
};

const parseMathText = (text: string): MathSegment[] => {
  const segments: MathSegment[] = [];
  let index = 0;

  const pushText = (content: string) => {
    if (!content) return;

    const previousSegment = segments[segments.length - 1];

    if (previousSegment?.type === 'text') {
      previousSegment.content += content;
      return;
    }

    segments.push({
      type: 'text',
      content,
    });
  };

  while (index < text.length) {
    if (text.startsWith('$$', index)) {
      const closeIndex = findClosingDelimiter(text, index + 2, '$$');

      if (closeIndex === -1) {
        pushText(text.slice(index));
        break;
      }

      const content = text.slice(index + 2, closeIndex).trim();

      if (!content) {
        pushText('$$$$');
      } else {
        segments.push({
          type: 'blockMath',
          content,
        });
      }

      index = closeIndex + 2;
      continue;
    }

    if (text[index] === '$') {
      const closeIndex = findClosingDelimiter(text, index + 1, '$');

      if (closeIndex === -1) {
        pushText(text.slice(index));
        break;
      }

      const content = text.slice(index + 1, closeIndex).trim();

      if (!content) {
        pushText('$$');
      } else {
        segments.push({
          type: 'inlineMath',
          content,
        });
      }

      index = closeIndex + 1;
      continue;
    }

    const nextMathIndex = text.indexOf('$', index);

    if (nextMathIndex === -1) {
      pushText(text.slice(index));
      break;
    }

    pushText(text.slice(index, nextMathIndex));
    index = nextMathIndex;
  }

  return segments;
};

const renderMath = (content: string, displayMode: boolean) => {
  return katex.renderToString(content, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
  });
};

export function MathText({ text, className = '', as = 'span' }: MathTextProps) {
  const segments = parseMathText(text);
  const content = segments.map((segment, index) => {
    if (segment.type === 'text') {
      return segment.content;
    }

    const isBlockMath = segment.type === 'blockMath';
    const html = renderMath(segment.content, isBlockMath);

    return (
      <span
        key={`${segment.type}-${index}`}
        className={isBlockMath ? 'my-3 block overflow-x-auto' : 'inline align-baseline'}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });

  const mergedClassName = ['math-text', className].filter(Boolean).join(' ');

  if (as === 'p') {
    return <p className={mergedClassName}>{content}</p>;
  }

  if (as === 'div') {
    return <div className={mergedClassName}>{content}</div>;
  }

  return <span className={mergedClassName}>{content}</span>;
}
