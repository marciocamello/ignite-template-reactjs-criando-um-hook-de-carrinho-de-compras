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

            const response = await api.get(`/products/${productId}`);
            const product = response.data;

            const productInCart = cart.find(p => p.id === productId);

            if (productInCart) {
                setCart(
                    cart.map(p =>
                        p.id === productId ? { ...product, quantity: p.amount + 1 } : p
                    )
                );
            } else {
                setCart([...cart, { ...product, amount: 1 }]);
            }

            toast.success('Produto adicionado ao carrinho');
        } catch {

            toast.error('Erro ao adicionar o produto ao carrinho');
        }
    };

    const removeProduct = (productId: number) => {
        try {

            setCart(cart.filter(p => p.id !== productId));
            toast.success('Produto removido do carrinho');
        } catch {

            toast.error('Erro ao remover o produto do carrinho');
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

            const response = await api.get(`/products/${productId}`);
            const product = response.data.amount;

            if (product < amount) {
                toast.error('Não temos tantos produtos no estoque');
                return;
            }

            setCart(state => {
                return state.map(p =>
                    p.id === productId ? { ...p, amount } : p
                );
            });

            toast.success('Produto atualizado no carrinho');
        } catch {

            toast.error('Erro ao atualizar o produto do carrinho');
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
