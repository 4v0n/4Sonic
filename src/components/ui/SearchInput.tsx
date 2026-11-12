import React from "react";
import { SearchIcon } from "../../constants/icons";
import TextInput, { type TextInputProps } from "./TextInput";

const SearchInput = React.forwardRef<HTMLInputElement, TextInputProps>((props, ref) => {
  return (
    <TextInput
      ref={ref}
      type="search"
      startIcon={<SearchIcon />}
      placeholder="Search"
      aria-label="Search"
      {...props}
    />
  );
});

SearchInput.displayName = "SearchInput";

export default SearchInput;
