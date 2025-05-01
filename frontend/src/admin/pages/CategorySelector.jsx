import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";

const CategorySelector = React.memo(
  ({
    selected,
    onChange,
    categories,
    placeholder,
    maxSelections,
    showImages,
    disabled,
  }) => {
    const isMultiple = maxSelections !== 1;

    const handleChange = (e) => {
      const selectedOptions = isMultiple
        ? Array.from(e.target.selectedOptions)
        : [
            {
              value: e.target.value,
              text: e.target.options[e.target.selectedIndex].text,
            },
          ];

      const newSelections = selectedOptions
        .map((option) => {
          const category = categories.find((cat) => cat._id === option.value);
          return category
            ? {
                _id: option.value,
                name: option.text,
                image: category.image,
              }
            : null;
        })
        .filter(Boolean);

      if (maxSelections && newSelections.length > maxSelections) {
        alert(`You can select up to ${maxSelections} parent categories.`);
        return;
      }
      onChange(newSelections);
    };

    // Only call onChange if selected categories are invalid or changed
    useEffect(() => {
      const validSelected = selected.filter((cat) =>
        categories.some((c) => c._id === cat._id)
      );
      const hasChanged =
        validSelected.length !== selected.length ||
        validSelected.some((cat, i) => cat._id !== selected[i]._id);
      if (hasChanged && validSelected.length > 0) {
        onChange(validSelected);
      }
    }, [selected, categories, onChange]);

    const options = useMemo(
      () =>
        categories.map((category) => (
          <option key={category._id} value={category._id}>
            {category.name}
          </option>
        )),
      [categories]
    );

    return (
      <div>
        <select
          multiple={isMultiple}
          disabled={disabled}
          value={
            isMultiple ? selected.map((cat) => cat._id) : selected[0]?._id || ""
          }
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm py-2 px-3 ${
            isMultiple ? "max-h-40" : ""
          } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        >
          <option value="" disabled={isMultiple}>
            {placeholder}
          </option>
          {options}
        </select>
        {showImages && selected.length > 0 && (
          <div className="mt-2 flex space-x-2">
            {selected.map((cat) =>
              cat.image ? (
                <img
                  key={cat._id}
                  src={cat.image}
                  alt={cat.name}
                  className="w-6 h-6 object-cover rounded"
                  onError={(e) => (e.target.src = "/placeholder-category.png")}
                />
              ) : null
            )}
          </div>
        )}
      </div>
    );
  }
);

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
  placeholder: "Select categories...",
  maxSelections: null,
  showImages: false,
  disabled: false,
};

export default CategorySelector;
