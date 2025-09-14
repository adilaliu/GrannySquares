"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function SearchBar({
  placeholder = "Search by dish, flavour, or country...",
  onSearch,
  className = "",
  value: controlledValue,
  onChange,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const router = useRouter();

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = onChange || setInternalValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchValue = value.trim();

    if (searchValue) {
      // If there's a custom onSearch handler, use it
      if (onSearch) {
        onSearch(searchValue);
      } else {
        // Otherwise, navigate to search page
        const params = new URLSearchParams();
        params.set("q", searchValue);
        router.push(`/search?${params.toString()}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          outline: "none",
          fontStyle: "normal",
          fontWeight: 400,
          fontSize: "24px",
          color: "#29160F",
        }}
        className="w-full h-full placeholder:text-[#29160F] placeholder:opacity-50 border-gray-400 border-2 rounded-2xl bg-white p-4 font-inter"
      />
    </form>
  );
}
