import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem('@RocketShoes:cart');

        if (storagedCart) {
            return JSON.parse(storagedCart);
        }

        return [];
    });

    const prevCartRef = useRef<Product[]>(cart);

    useEffect(() => {
        prevCartRef.current = cart;
    }, [cart]);

    const cartPreviousValue = prevCartRef.current ?? cart;

    useEffect(() => {
        if (cartPreviousValue !== cart) {
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
        }
    }, [cart, cartPreviousValue]);

    const addProduct = async (productId: number) => {
        try {

            const updatedCart = [...cart];

            const product = updatedCart.find(p => p.id === productId);

            const stock = await api.get<Stock>(`/stock/${productId}`);

            const stockAmount = stock.data.amount;
            const currentAmmout = product?.amount ?? 0;
            const ammount = currentAmmout + 1;

            if (ammount > stockAmount) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            if (product) {
                product.amount = ammount;
            } else {
                const response = await api.get<Product>(`/products/${productId}`);
                const newProduct = {
                    ...response.data,
                    amount: 1,
                }

                updatedCart.push(newProduct);
            }

            setCart(updatedCart);

            toast.success('Produto adicionado ao carrinho');
        } catch {

            toast.error('Erro na adição do produto');
        }
    };

    const removeProduct = (productId: number) => {
        try {

            const updatedCart = [...cart];
            const productIndex = updatedCart.findIndex(p => p.id === productId);

            if (productIndex >= 0) {
                updatedCart.splice(productIndex, 1);
                setCart(updatedCart);
                toast.success('Produto removido do carrinho');
            } else {
                throw Error();
            }

        } catch {

            toast.error('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {

            if (amount <= 0) {
                return;
            }

            const stock = await api.get<Stock>(`/stock/${productId}`);

            const stockAmount = stock.data.amount;

            if (amount > stockAmount) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            const updatedCart = [...cart];
            const product = updatedCart.find(p => p.id === productId);

            if (product) {
                product.amount = amount;
                setCart(updatedCart);
            }

            toast.success('Produto atualizado no carrinho');
        } catch {

            toast.error('Erro na alteração de quantidade do produto');
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
