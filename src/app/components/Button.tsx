import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-orange-500 
        text-white 
        rounded-full 
        font-medium 
        font-advent-pro
        transition-all 
        duration-200 
        hover:bg-orange-600 
        active:bg-orange-700 
        disabled:bg-orange-300 
        disabled:cursor-not-allowed
        focus:outline-none 
        focus:ring-2 
        focus:ring-orange-500 
        focus:ring-offset-2
        ${sizeClasses[size]}
        ${className}
      `
        .trim()
        .replace(/\s+/g, " ")}
    >
      {children}
    </button>
  );
};

export default Button;
