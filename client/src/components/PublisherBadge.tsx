import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PublisherBadgeProps {
  name: string;
  logo?: string;
  size?: "sm" | "md" | "lg";
}

export function PublisherBadge({ name, logo, size = "sm" }: PublisherBadgeProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex items-center gap-2" data-testid={`publisher-${name.toLowerCase().replace(/\s+/g, "-")}`}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={logo} alt={name} />
        <AvatarFallback className="text-xs font-semibold">
          {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <span className={`font-medium ${textSizeClasses[size]}`}>{name}</span>
    </div>
  );
}
