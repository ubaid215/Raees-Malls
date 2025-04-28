import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const CategorySelector = React.memo(({ 
  selected, 
  onChange, 
  categories, 
  placeholder, 
  maxSelections,
  showImages = false,
  disabled = false
}) => {
  const handleChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => {
      const category = categories.find(cat => cat._id === option.value);
      return {
        _id: option.value,
        name: option.text,
        image: category?.image
      };
    });
    
    if (maxSelections && selectedOptions.length > maxSelections) {
      alert(`You can select up to ${maxSelections} parent categories.`);
      return;
    }
    onChange(selectedOptions);
  };

  // Sync selected categories with form
  useEffect(() => {
    if (selected.length > 0) {
      onChange(selected);
    }
  }, [selected, onChange]);

  return (
    <select
      multiple
      disabled={disabled}
      value={selected.map(cat => cat._id)}
      onChange={handleChange}
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm py-2 px-3 max-h-40 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
    >
      {categories.length === 0 ? (
        <option disabled>{placeholder || 'No categories available'}</option>
      ) : (
        categories.map(category => (
          <option key={category._id} value={category._id}>
            {showImages && category.image ? (
              <div className="flex items-center">
                <img 
                  src={category.image} 
                  alt={category.name} 
                  className="w-6 h-6 mr-2 object-cover rounded"
                />
                {category.name}
              </div>
            ) : category.name}
          </option>
        ))
      )}
    </select>
  );
});

CategorySelector.propTypes = {
  selected: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string,
    })
  ),
  onChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string,
    })
  ).isRequired,
  placeholder: PropTypes.string,
  maxSelections: PropTypes.number,
  showImages: PropTypes.bool,
  disabled: PropTypes.bool,
};

CategorySelector.defaultProps = {
  selected: [],
  placeholder: 'Select categories...',
  maxSelections: null,
  showImages: false,
  disabled: false,
};

export default CategorySelector;