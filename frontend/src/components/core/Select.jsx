import React from "react";
import PropTypes from "prop-types";

// Component: Select
// Description: A reusable select dropdown component with Tailwind CSS styling, designed for choosing from a list of options
const Select = React.forwardRef(
  ({ label, error, options = [], className = "", ...props }, ref) => {
    // Section: Render
    // Description: Render the select dropdown with label, options, and error message
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          {...props}
          className={`mt-1 block w-full px-3 py-2 border ${
            error
              ? "border-red-600 focus:ring-red-600 focus:border-red-600"
              : "border-gray-300 focus:ring-[#E63946] focus:border-[#E63946]"
          } rounded-md shadow-sm text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

// Display name for debugging
Select.displayName = "Select";

// Prop types for validation
Select.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  className: PropTypes.string,
  id: PropTypes.string,
};

export default Select;