import React from "react";
import { SearchIcon } from "../../constants/Icons";

const SearchInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5" />
      </div>
      <input
        type="search"
        className="block w-full pl-10 pr-3 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm"
        {...props}
      />
    </div>
  );
};

export default SearchInput;