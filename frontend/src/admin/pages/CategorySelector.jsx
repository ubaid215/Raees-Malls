import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const CategorySelector = React.memo(({ selected, onChange, categories, placeholder, maxSelections }) => {
  const handleChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => ({
      _id: option.value,
      name: option.text,
    }));
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
      value={selected.map(cat => cat._id)}
      onChange={handleChange}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm py-2 px-3 max-h-40"
    >
      {categories.length === 0 ? (
        <option disabled>{placeholder || 'No categories available'}</option>
      ) : (
        categories.map(category => (
          <option key={category._id} value={category._id}>
            {category.name}
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
    })
  ),
  onChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  placeholder: PropTypes.string,
  maxSelections: PropTypes.number,
};

CategorySelector.defaultProps = {
  selected: [],
  placeholder: 'Select categories...',
  maxSelections: null,
};

export default CategorySelector;