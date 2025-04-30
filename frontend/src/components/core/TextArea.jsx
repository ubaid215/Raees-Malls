import React from "react";
import PropTypes from "prop-types";

// Component: Textarea
// Description: A reusable textarea input component with Tailwind CSS styling, designed for multi-line text input
const Textarea = React.forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    // Section: Render
    // Description: Render the textarea with label and error message
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
        <textarea
          ref={ref}
          {...props}
          className={`mt-1 block w-full px-3 py-2 border ${
            error
              ? "border-red-600 focus:ring-red-600 focus:border-red-600"
              : "border-gray-300 focus:ring-[#E63946] focus:border-[#E63946]"
          } rounded-md shadow-sm text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        />
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
Textarea.displayName = "Textarea";

// Prop types for validation
Textarea.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
};

export default Textarea;