import React from "react";

interface ButtonProps {
  text: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ text, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-300"
    >
      {text}
    </button>
  );
};

export default Button;
