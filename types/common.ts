type VariantIcon = "stroke" | "bulk" | "solid";

interface IconProps {
  color?: string;
  size?: number;
  variant?: VariantIcon;
  className?: string;
  strokeWidth?: number;
}

export type { IconProps };
