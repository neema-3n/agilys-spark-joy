import { type MouseEventHandler, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPublicCtaId,
  PUBLIC_CTA_LABELS,
  PUBLIC_CTA_TARGETS,
  type PublicCtaRole,
  type PublicCtaSurface,
} from "@/config/public-cta";

type PublicCtaAction = {
  label?: string;
  to?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

type PublicCtaGroupProps = {
  surface: PublicCtaSurface;
  className?: string;
  primary?: PublicCtaAction;
  secondary?: PublicCtaAction;
};

const resolveAction = (role: PublicCtaRole, action?: PublicCtaAction): Required<PublicCtaAction> => ({
  label: action?.label ?? PUBLIC_CTA_LABELS[role],
  to: action?.to ?? PUBLIC_CTA_TARGETS[role],
  variant: action?.variant ?? (role === "primary" ? "default" : "outline"),
  size: action?.size ?? "lg",
  className: action?.className ?? "",
  icon: action?.icon ?? null,
  onClick: action?.onClick ?? undefined,
});

const PublicCtaGroup = ({ surface, className, primary, secondary }: PublicCtaGroupProps) => {
  const actions: Array<{ role: PublicCtaRole; config: Required<PublicCtaAction> }> = [
    { role: "primary", config: resolveAction("primary", primary) },
    { role: "secondary", config: resolveAction("secondary", secondary) },
  ];

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {actions.map(({ role, config }) => (
        <Button key={role} asChild variant={config.variant} size={config.size} className={config.className}>
          <Link
            to={config.to}
            onClick={config.onClick}
            aria-label={config.label}
            data-cta-id={getPublicCtaId(surface, role)}
            data-cta-role={role}
            data-cta-surface={surface}
          >
            {config.label}
            {config.icon}
          </Link>
        </Button>
      ))}
    </div>
  );
};

export default PublicCtaGroup;
