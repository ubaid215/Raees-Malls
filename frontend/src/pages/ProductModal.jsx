import Button from "../components/core/Button"; // Ensure Button is imported

const ProductModal = ({ product, onClose }) => {
  return (
    <Modal isOpen={!!product} onClose={onClose} size="lg">
      {product && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{product.title || "Untitled Product"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <img
                src={product.images?.[0] || "/placeholder-product.png"}
                alt={product.title || "Product Image"}
                className="w-full rounded-lg object-cover"
                onError={(e) => (e.target.src = "/placeholder-product.png")}
              />
            </div>
            <div className="space-y-3">
              <p className="text-gray-600">{product.description || "No description available"}</p>
              <p className="text-xl font-bold">${(product.price || 0).toFixed(2)}</p>
              <p className="text-sm">
                Status: <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </span>
              </p>
              <Button onClick={onClose} variant="outline">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ProductModal; // Add export if missing