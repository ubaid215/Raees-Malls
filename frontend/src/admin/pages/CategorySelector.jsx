import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown, FiCheck, FiX } from 'react-icons/fi';

const CategorySelector = React.memo(({ 
  selected = [], 
  onChange,
  categories = [],
  placeholder = "Select categories...",
  maxSelections = 5
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredCategories = useMemo(() => {
    return categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  const toggleCategory = useCallback((category) => {
    const newSelected = selected.some(c => c._id === category._id)
      ? selected.filter(c => c._id !== category._id)
      : [...selected, category].slice(0, maxSelections);
    
    onChange(newSelected);
  }, [selected, maxSelections, onChange]);

  const removeCategory = useCallback((categoryId, e) => {
    e.stopPropagation();
    onChange(selected.filter(c => c._id !== categoryId));
  }, [selected, onChange]);

  return (
    <div className="relative w-full">
      <div 
        className="flex items-center justify-between p-2 border border-gray-300 rounded-md cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selected.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selected.map(category => (
              <span 
                key={category._id} 
                className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
              >
                {category.name}
                <button 
                  type="button"
                  onClick={(e) => removeCategory(category._id, e)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  aria-label={`Remove ${category.name}`}
                >
                  <FiX size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search categories..."
              className="w-full p-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="p-3 text-center text-gray-500">
                {categories.length === 0 ? 'No categories available' : 'No matching categories found'}
              </div>
            ) : (
              filteredCategories.map(category => (
                <div
                  key={category._id}
                  className={`flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 ${selected.some(c => c._id === category._id) ? 'bg-blue-50' : ''}`}
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category.name}</span>
                  {selected.some(c => c._id === category._id) && (
                    <FiCheck className="text-blue-500" />
                  )}
                </div>
              ))
            )}
          </div>

          {maxSelections && (
            <div className="p-2 text-xs text-gray-500 border-t">
              {selected.length} of {maxSelections} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CategorySelector.propTypes = {
  selected: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ),
  onChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ),
  placeholder: PropTypes.string,
  maxSelections: PropTypes.number
};

CategorySelector.defaultProps = {
  selected: [],
  categories: [],
  placeholder: "Select categories...",
  maxSelections: null
};

export default CategorySelector;