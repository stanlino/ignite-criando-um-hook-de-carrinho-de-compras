import { createContext, ReactNode, ReactText, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<ReactText | void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<ReactText | void>;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stock = await api.get(`stock/${productId}`)

      if (stock.data.amount === 0) return toast.error('Quantidade solicitada fora de estoque')
      
      const { data } = await api.get(`products/${productId}`)

      const productExist = cart.find(product => product.id === productId)

      if (productExist) {
        return updateProductAmount({ productId, amount: productExist.amount + 1 })
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...data, amount: 1}]))
      setCart(oldCart => [...oldCart, {...data, amount: 1}])
      
    } catch (error) {
      console.log(error)
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartClone = cart.map(item => ({ ...item }))

      const productExist = cartClone.find(product => product.id === productId)
      
      if (!productExist) return toast.error('Erro na remoção do produto')

      const updatedCart = cartClone.filter(product => product.id !== productId)

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    
    if (amount === 0) return

    try {
      const cartClone = cart.map(product => ({ ...product }))

      const foundProduct = cartClone.find(product => product.id === productId)

      if (!foundProduct) return toast.error('Erro na alteração de quantidade do produto')

      const stock = await api.get(`stock/${productId}`)

      if (stock.data.amount < amount) return toast.error('Quantidade solicitada fora de estoque')

      foundProduct.amount = amount
      setCart(cartClone)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartClone))

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
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
