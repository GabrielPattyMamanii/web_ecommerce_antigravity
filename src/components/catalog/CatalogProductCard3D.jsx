import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CardBody, CardContainer, CardItem } from "../ui/3d-card";
import { getProductUrl } from "../../lib/urlUtils";
import { HandCoins } from "lucide-react";
import { SenaModal } from "../senas/SenaModal";

export function CatalogProductCard3D({ product, senaEnabled = true }) {
    const [senaModalOpen, setSenaModalOpen] = useState(false);
    // Safe helpers to prevent crashes if fields are missing
    const price = product.retail_price || product.price || 0;
    const originalPrice = product.original_price; // Assuming this field exists, if not it will be undefined
    // For 'isNew' or 'onSale', we might need to derive them or verify if they exist in schema. 
    // Assuming 'new' is based on created_at or a flag. 
    // The user prompt used `product.isNew`. I'll adapt to likely existing fields or keep as is if I can't confirm.
    // Checking Home.jsx, 'newArrivals' logic used date. I will use a simple check or just `product.isNew` if it was added to schema.
    // Since I can't easily check schema right now without more queries, I'll stick to what I can derive or safe defaults.
    // Actually, let's look at `product` object structure from `Catalog.jsx`: it has `created_at`.
    const isNew = (new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24) < 14;
    const hasDiscount = product.discount_percentage > 0;

    return (
    <>
        <CardContainer className="inter-var w-full h-full lg:[perspective:1000px] perspective-none">
            <CardBody className="bg-white relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-full h-full rounded-xl p-4 border transition-all duration-300">

                {/* Image Container with Badge */}
                <div className="relative w-full">
                    <CardItem translateZ="100" className="w-full">
                        <Link to={getProductUrl(product.id)}>
                            <div className="relative aspect-[3/4] overflow-hidden rounded-lg w-full">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover/card:shadow-xl transition-all duration-300"
                                />
                            </div>
                        </Link>
                    </CardItem>

                    {/* Badge NUEVO or DISCOUNT */}
                    {hasDiscount ? (
                        <CardItem translateZ="80" className="absolute top-3 right-3">
                            <span className="bg-public-tertiary text-public-primary px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                -{product.discount_percentage}%
                            </span>
                        </CardItem>
                    ) : isNew && (
                        <CardItem translateZ="80" className="absolute top-3 right-3">
                            <span className="bg-public-tertiary text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                NUEVO
                            </span>
                        </CardItem>
                    )}
                </div>

                {/* Product Name */}
                <CardItem
                    translateZ="50"
                    className="text-base font-bold mt-4 line-clamp-2 w-full"
                >
                    <Link to={getProductUrl(product.id)} className="font-chango text-public-primary hover:underline">
                        {product.name}
                    </Link>
                </CardItem>

                {/* Category (Optional) */}
                {product.category && (
                    <CardItem
                        translateZ="40"
                        className="text-sm text-gray-500 mt-1"
                    >
                        {product.category}
                    </CardItem>
                )}

                {/* Rating Stars - Keeping consistent with other cards if needed, but user didn't explicitly ask. 
           But it looks good. Let's add it if space permits, or stick strictly to user request to avoid clutter.
           User request: "Nombre... Precio... Botones". I will skip rating to match 3D reference closer.
        */}

                {/* Price */}
                <div className="mt-3">
                    <div className="flex items-center gap-2">
                        <CardItem
                            translateZ="60"
                            className="text-xl font-bold text-public-secondary"
                        >
                            ${price}
                        </CardItem>
                        {hasDiscount && (
                            <CardItem
                                translateZ="40"
                                className="text-sm text-gray-400 line-through"
                            >
                                ${(price / (1 - product.discount_percentage / 100)).toFixed(2)}
                            </CardItem>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 items-center">
                    <CardItem translateZ="20" className="flex-1">
                        <Link to={getProductUrl(product.id)}>
                            <button className="w-full px-4 py-2 rounded-full bg-public-secondary text-white text-sm font-medium hover:bg-public-primary transition-all duration-300">
                                Ver Detalle
                            </button>
                        </Link>
                    </CardItem>

                    {senaEnabled && (
                        <CardItem translateZ="20" className="flex-shrink-0">
                            <button
                                onClick={() => setSenaModalOpen(true)}
                                title="Hacer una seña"
                                className="p-2 rounded-full border-2 border-[#009EE3] text-[#009EE3] hover:bg-[#009EE3] hover:text-white transition-all duration-300"
                            >
                                <HandCoins className="w-4 h-4" />
                            </button>
                        </CardItem>
                    )}
                </div>
            </CardBody>
        </CardContainer>

        {senaModalOpen && (
            <SenaModal
                product={{
                    ...product,
                    images: product.image ? [product.image] : [],
                    retail_price: product.retail_price || product.price || 0,
                    source: product.source || 'products',
                }}
                onClose={() => setSenaModalOpen(false)}
            />
        )}
    </>
    );

}
