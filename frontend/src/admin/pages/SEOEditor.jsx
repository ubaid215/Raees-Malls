import React, { useState, useEffect } from 'react';
import Input from '../../components/core/Input';

const SEOEditor = ({ seoData, onChange, titleSuggestions, descriptionSuggestions }) => {
  const [suggestions, setSuggestions] = useState({
    title: [],
    description: [],
    keywords: [],
    slug: []
  });

  // Generate suggestions when props change
  useEffect(() => {
    if (titleSuggestions) {
      // Generate title suggestions
      const titleOptions = [
        titleSuggestions,
        `Buy ${titleSuggestions} - Best Price & Quality`,
        `${titleSuggestions} - Premium Quality Product`
      ];
      
      // Generate keyword suggestions based on title
      const words = titleSuggestions.split(' ');
      const keywordOptions = [
        words.join(', ').toLowerCase(),
        `${words.join(', ')}, buy online, best price`,
        `${words[0]}, ${titleSuggestions.toLowerCase()}, premium`
      ];
      
      // Generate slug suggestions
      const slugOptions = [
        generateSlug(titleSuggestions),
        `buy-${generateSlug(titleSuggestions)}`,
        `${generateSlug(titleSuggestions)}-product`
      ];

      setSuggestions(prev => ({
        ...prev,
        title: titleOptions,
        keywords: keywordOptions,
        slug: slugOptions
      }));
    }

    if (descriptionSuggestions) {
      // Generate description suggestions
      const descOptions = [
        descriptionSuggestions.substring(0, 160),
        `Shop for ${titleSuggestions || 'our product'} - ${descriptionSuggestions.substring(0, 120)}`,
        `Best quality ${titleSuggestions || 'product'} available for purchase. ${descriptionSuggestions.substring(0, 100)}`
      ];

      setSuggestions(prev => ({
        ...prev,
        description: descOptions
      }));
    }
  }, [titleSuggestions, descriptionSuggestions]);

  const generateSlug = (title) => {
    return title?.toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-') || '';
  };

  const applySuggestion = (field, value) => {
    onChange({
      target: { name: field, value }
    });
  };

  const generateMetaSuggestions = () => {
    // Auto-generate SEO content based on available data
    const autoTitle = titleSuggestions ? `Buy ${titleSuggestions} - Premium Quality` : seoData.title;
    const autoDesc = descriptionSuggestions 
      ? descriptionSuggestions.substring(0, 155) + '...' 
      : seoData.description;
    const autoKeywords = titleSuggestions 
      ? titleSuggestions.toLowerCase().split(' ').join(', ') + ', buy online, quality product' 
      : seoData.keywords;
    const autoSlug = titleSuggestions 
      ? generateSlug(titleSuggestions) 
      : seoData.slug;
    
    // Apply all suggestions at once
    onChange({ target: { name: 'title', value: autoTitle } });
    onChange({ target: { name: 'description', value: autoDesc } });
    onChange({ target: { name: 'keywords', value: autoKeywords } });
    onChange({ target: { name: 'slug', value: autoSlug } });
  };

  return (
    <div className="space-y-4 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">SEO Settings</h2>
        <button
          type="button"
          onClick={generateMetaSuggestions}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
        >
          Auto-generate All
        </button>
      </div>
      
      <div className="space-y-1">
        <Input
          label="SEO Title"
          name="title"
          value={seoData.title}
          onChange={onChange}
          placeholder={titleSuggestions || 'Product Title'}
        />
        {suggestions.title.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestions.title.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applySuggestion('title', suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition"
              >
                {suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Input
          label="SEO Description"
          name="description"
          value={seoData.description}
          onChange={onChange}
          as="textarea"
          rows={3}
          placeholder={descriptionSuggestions || 'Product description in 160 characters'}
        />
        {suggestions.description.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestions.description.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applySuggestion('description', suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition"
              >
                {suggestion.length > 40 ? suggestion.substring(0, 40) + '...' : suggestion}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {seoData.description ? `${seoData.description.length}/160 characters` : '0/160 characters'}
        </p>
      </div>

      <div className="space-y-1">
        <Input
          label="Keywords (comma separated)"
          name="keywords"
          value={seoData.keywords}
          onChange={onChange}
        />
        {suggestions.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestions.keywords.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applySuggestion('keywords', suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition"
              >
                {suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Input
          label="Slug"
          name="slug"
          value={seoData.slug}
          onChange={onChange}
          onFocus={() => {
            if (!seoData.slug && titleSuggestions) {
              onChange({
                target: { name: 'slug', value: generateSlug(titleSuggestions) }
              });
            }
          }}
        />
        {suggestions.slug.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestions.slug.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applySuggestion('slug', suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOEditor;