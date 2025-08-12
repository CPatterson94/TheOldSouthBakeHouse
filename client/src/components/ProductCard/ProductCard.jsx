import React from "react";
import "./ProductCard.scss";

const ProductCard = ({
  product,
  onAddToCart,
  cartQuantity = 0,
  onIncreaseQuantity,
  onDecreaseQuantity,
}) => {
  if (!product) {
    return null;
  }

  return (
    <div className="product-card">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="product-card__image"
        />
      )}
      <div className="product-card__content">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__description">{product.description}</p>
        <p className="product-card__price">
          ${product.price ? product.price.toFixed(2) : "N/A"}
        </p>
        {product.ingredients && (
          <p className="product-card__ingredients">
            <strong>Ingredients:</strong> {product.ingredients}
          </p>
        )}
        <p className="product-card__category">Category: {product.category}</p>

        {cartQuantity > 0 ? (
          <div className="product-card__quantity-selector">
            <button
              className="btn btn-outline-secondary btn-sm quantity-btn"
              onClick={() => onDecreaseQuantity(product.id)}
            >
              -
            </button>
            <span className="quantity-display">{cartQuantity}</span>
            <button
              className="btn btn-outline-secondary btn-sm quantity-btn"
              onClick={() => onIncreaseQuantity(product.id)}
            >
              +
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary product-card__button"
            onClick={() => onAddToCart(product)}
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
