import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { useCartStore } from '../../context/cartStore';
import { usePriceStore } from '../../context/priceStore';

export function ProductCard({ product }) {
    const addItem = useCartStore((state) => state.addItem);
    const { isWholesale } = usePriceStore();

    // Calculate price based on mode
    // Calculate price based on mode
    const retail = product.retail_price || 0;
    const wholesale = product.wholesale_price || (retail * 0.8);
    const displayPrice = isWholesale ? wholesale : retail;

    return (
        <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow">
            <Link to={`/product/${product.id}`} className="block aspect-square relative overflow-hidden bg-gray-100">
                <img
                    src={product.image}
                    alt={product.name}
                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                />
            </Link>
            <CardHeader className="p-4">
                <Link to={`/product/${product.id}`}>
                    <CardTitle className="text-lg hover:text-primary transition-colors">{product.name}</CardTitle>
                </Link>
                <p className="text-sm text-muted-foreground mt-1">{product.category}</p>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
                <p className="font-bold text-xl">
                    ${displayPrice.toFixed(2)}
                    {isWholesale && <span className="text-xs text-muted-foreground ml-1">(Mayorista)</span>}
                </p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <Button className="w-full" onClick={() => addItem({ ...product, price: displayPrice })}>
                    Agregar al Carrito
                </Button>
            </CardFooter>
        </Card>
    );
}
