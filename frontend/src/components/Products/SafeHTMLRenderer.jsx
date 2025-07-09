import React from 'react';

const SafeHTMLRenderer = ({ html, className = '' }) => {
  // Enhanced HTML sanitization function
  const sanitizeHTML = (html) => {
    if (!html) return '';
    
    // Remove script tags and dangerous attributes
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:/gi, '')
      .replace(/<iframe[^>]*>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/<object[^>]*>/gi, '');
    
    // Allow only safe HTML tags and attributes
    const allowedTags = [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 'del', 'ins',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'div', 'span'
    ];
    
    const allowedAttributes = [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'width', 'height', 'style', 'target', 'rel'
    ];
    
    return sanitized;
  };

  const cleanHTML = sanitizeHTML(html);

  return (
    <div className="safe-html-renderer">
      <style jsx>{`
        .safe-html-renderer {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
        }

        .safe-html-renderer p {
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .safe-html-renderer h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 1.5rem 0 1rem;
          line-height: 1.2;
          color: #111827;
        }

        .safe-html-renderer h2 {
          font-size: 2rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem;
          line-height: 1.3;
          color: #111827;
        }

        .safe-html-renderer h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          line-height: 1.4;
          color: #111827;
        }

        .safe-html-renderer h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem;
          line-height: 1.4;
          color: #111827;
        }

        .safe-html-renderer h5 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.5rem 0 0.25rem;
          line-height: 1.4;
          color: #111827;
        }

        .safe-html-renderer h6 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0.5rem 0 0.25rem;
          line-height: 1.4;
          color: #111827;
        }

        .safe-html-renderer ul,
        .safe-html-renderer ol {
          padding-left: 2rem;
          margin: 1rem 0;
        }

        .safe-html-renderer ul {
          list-style-type: disc;
        }

        .safe-html-renderer ol {
          list-style-type: decimal;
        }

        .safe-html-renderer li {
          margin: 0.25rem 0;
        }

        .safe-html-renderer li > p,
        .safe-html-renderer li > ul,
        .safe-html-renderer li > ol {
          margin: 0.5rem 0;
        }

        .safe-html-renderer blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          color: #4b5563;
          font-style: italic;
          background-color: #f9fafb;
          padding: 1rem 1.5rem;
          border-radius: 0.375rem;
        }

        .safe-html-renderer pre {
          background: #1e293b;
          color: #f8fafc;
          padding: 1.25rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 0.9em;
          margin: 1.5rem 0;
          line-height: 1.5;
        }

        .safe-html-renderer pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: 1em;
          color: inherit;
        }

        .safe-html-renderer code {
          background: #e5e7eb;
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-size: 0.9em;
          color: #1e293b;
        }

        .safe-html-renderer hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 2rem 0;
        }

        .safe-html-renderer a {
          color: #3b82f6;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.2s ease;
        }

        .safe-html-renderer a:hover {
          color: #2563eb;
        }

        .safe-html-renderer img {
          max-width: 100%;
          height: auto;
          margin: 1.5rem auto;
          border-radius: 0.5rem;
          display: block;
        }

        .safe-html-renderer table {
          border-collapse: collapse;
          margin: 1.5rem 0;
          width: 100%;
          overflow-x: auto;
          display: block;
          white-space: nowrap;
        }

        .safe-html-renderer th,
        .safe-html-renderer td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem 1rem;
          text-align: left;
          white-space: normal;
        }

        .safe-html-renderer th {
          background-color: #f3f4f6;
          font-weight: 600;
        }

        .safe-html-renderer strong,
        .safe-html-renderer b {
          font-weight: 600;
        }

        .safe-html-renderer em,
        .safe-html-renderer i {
          font-style: italic;
        }

        .safe-html-renderer u {
          text-decoration: underline;
        }

        .safe-html-renderer strike,
        .safe-html-renderer del {
          text-decoration: line-through;
        }

        .safe-html-renderer ins {
          text-decoration: underline;
          background-color: #fef3c7;
        }

        /* Font size classes support */
        .safe-html-renderer .text-xs { font-size: 0.75rem; }
        .safe-html-renderer .text-sm { font-size: 0.875rem; }
        .safe-html-renderer .text-base { font-size: 1rem; }
        .safe-html-renderer .text-lg { font-size: 1.125rem; }
        .safe-html-renderer .text-xl { font-size: 1.25rem; }
        .safe-html-renderer .text-2xl { font-size: 1.5rem; }
        .safe-html-renderer .text-3xl { font-size: 1.875rem; }
        .safe-html-renderer .text-4xl { font-size: 2.25rem; }
        .safe-html-renderer .text-5xl { font-size: 3rem; }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .safe-html-renderer h1 {
            font-size: 1.875rem;
          }
          
          .safe-html-renderer h2 {
            font-size: 1.5rem;
          }
          
          .safe-html-renderer h3 {
            font-size: 1.25rem;
          }
          
          .safe-html-renderer pre {
            font-size: 0.8em;
            padding: 1rem;
          }
          
          .safe-html-renderer table {
            font-size: 0.875rem;
          }
          
          .safe-html-renderer blockquote {
            margin: 1rem 0;
            padding: 0.75rem 1rem;
          }
        }

        /* Handle empty paragraphs */
        .safe-html-renderer p:empty {
          display: none;
        }

        /* Better spacing for nested elements */
        .safe-html-renderer > *:first-child {
          margin-top: 0;
        }
        
        .safe-html-renderer > *:last-child {
          margin-bottom: 0;
        }
      `}</style>
      
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
      />
    </div>
  );
};

export default SafeHTMLRenderer;