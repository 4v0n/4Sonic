import { createContext, useContext } from "react";

export const ScrollContainerContext = createContext<HTMLElement | null>(null);

export const useScrollContainer = () => useContext(ScrollContainerContext);
