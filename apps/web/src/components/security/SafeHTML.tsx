import React, { useMemo } from 'react';
import { useTrustedTypes } from '../../middleware/trusted-types';

export interface SafeHTMLProps {
  html: string;
  tag?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent) => void;
  onError?: (error: Error) => void;
  sanitizationLevel?: 'strict' | 'moderate' | 'minimal';
}

export const SafeHTML: React.FC<SafeHTMLProps> = ({
  html,
  tag: Tag = 'div' as keyof React.JSX.IntrinsicElements,
  className,
  style,
  onClick,
  onError,
  sanitizationLevel = 'strict',
  ...props
}) => {
  const { createSafeHTML, isConfigured } = useTrustedTypes();

  const safeHTML = useMemo(() => {
    try {
      // Apply different levels of sanitization
      let processedHTML = html;

      if (sanitizationLevel === 'strict') {
        processedHTML = applyStrictSanitization(html);
      } else if (sanitizationLevel === 'moderate') {
        processedHTML = applyModerateSanitization(html);
      } else {
        processedHTML = applyMinimalSanitization(html);
      }

      return createSafeHTML(processedHTML);
    } catch (error) {
      onError?.(error as Error);
      return createSafeHTML('<!-- HTML sanitization failed -->');
    }
  }, [html, sanitizationLevel, createSafeHTML, onError]);

  // Trusted Types compliance check
  if (!isConfigured() && process.env['NODE_ENV'] === 'development') {
    console.warn('SafeHTML: Trusted Types not configured, falling back to basic sanitization');
  }

  return (
    <Tag
      className={className}
      style={style}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: safeHTML }}
      {...props}
    />
  );
};

// Sanitization levels
function applyStrictSanitization(html: string): string {
  // Remove all script tags, event handlers, and dangerous elements
  let sanitized = html;

  // Remove script tags completely
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove dangerous tags
  const dangerousTags = [
    'script',
    'object',
    'embed',
    'iframe',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'option',
    'link',
    'meta',
    'base',
    'style',
  ];

  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove all event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]*/gi, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');

  return sanitized;
}

function applyModerateSanitization(html: string): string {
  // Allow some formatting but remove dangerous content
  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove some dangerous tags but allow formatting
  const dangerousTags = ['script', 'object', 'embed', 'iframe', 'form'];

  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]*/gi, '');

  return sanitized;
}

function applyMinimalSanitization(html: string): string {
  // Only remove the most dangerous content
  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
}

// Hook for safe HTML operations
export function useSafeHTML() {
  const { createSafeHTML, isConfigured } = useTrustedTypes();

  return {
    sanitizeHTML: (html: string, level: SafeHTMLProps['sanitizationLevel'] = 'strict') => {
      let processed = html;

      if (level === 'strict') {
        processed = applyStrictSanitization(html);
      } else if (level === 'moderate') {
        processed = applyModerateSanitization(html);
      } else {
        processed = applyMinimalSanitization(html);
      }

      return createSafeHTML(processed);
    },
    isSecure: isConfigured(),
    createSafeHTML,
  };
}

export default SafeHTML;
