import React, { useState } from "react";
import Button from "../core/Button";
import { toast } from "react-toastify";

const ReviewForm = ({ productId, orderId, onSubmit, onClose }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const errors = {};
    if (!rating || rating < 1 || rating > 5) {
      errors.rating = "Please select a rating between 1 and 5";
    }
    if (comment && comment.length > 1000) {
      errors.comment = "Comment cannot exceed 1000 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(productId, orderId, rating, comment);
      setRating(0);
      setComment("");
      setFormErrors({});
    } catch (err) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          Write a Review
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rating
            </label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl sm:text-3xl ${
                    rating >= star ? "text-yellow-400" : "text-gray-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            {formErrors.rating && (
              <p className="mt-1 text-sm text-red-600">{formErrors.rating}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700"
            >
              Comment (Optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                formErrors.comment ? "border-red-500" : "border-gray-300"
              }`}
              rows="4"
            />
            {formErrors.comment && (
              <p className="mt-1 text-sm text-red-600">{formErrors.comment}</p>
            )}
          </div>
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={onClose}
              className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;