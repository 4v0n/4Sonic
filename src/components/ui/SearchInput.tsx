import React from "react";
import { SearchIcon } from "../../constants/icons";
import TextInput from "./TextInput";

const SearchInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <TextInput
      type="search"
      startIcon={<SearchIcon />}
      placeholder="Search"
      aria-label="Search"
      {...props}
    />
  );
};

export default SearchInput;
