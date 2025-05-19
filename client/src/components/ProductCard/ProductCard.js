import React from "react";
import "./ProductCard.scss";

const ProductCard = ({ product, onAddToCart }) => {
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
        <p className="product-card__category">Category: {product.category}</p>
        <button
          className="btn btn-primary product-card__button"
          onClick={() => onAddToCart(product)}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
