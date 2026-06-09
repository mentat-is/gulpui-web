import s from "./styles/menu.module.css";
import { Application } from "@/context/Application.context";
import { Stack } from "@/ui/Stack";
import { Button } from "@/ui/Button";
import React, { useEffect, useState, useRef } from "react";
import { cn } from "@impactium/utils";
import { Icon } from "@impactium/icons";

/**
 * Represents a single item rendered inside the Menu component.
 */
export interface MenuItem {
  /** The display label shown when the menu is expanded. */
  label: string;
  /** The icon name from the `@impactium/icons` library. */
  icon: Icon.Name;
  /** Callback invoked when the item is clicked. */
  action: () => void;
  /**
   * The category name used to visually group this item under a section header.
   * Items sharing the same category are rendered together under one header.
   */
  category: string;
}

export namespace Menu {
  export interface Props {
    /** Items rendered at the top scroll area, grouped by their `category` field. */
    topItems: MenuItem[];
    /** Items rendered in the pinned bottom area, grouped by their `category` field. */
    bottomItems: MenuItem[];
    /**
     * Pre-selected extension plugin nodes supplied by the consumer.
     * Menu wraps each child with the expand/collapse-aware `pluginWrapper` styling.
     */
    pluginNodes?: React.ReactNode;
  }
}

/**
 * Groups an array of `MenuItem` objects by their `category` field,
 * preserving the insertion order of categories.
 *
 * @param items - The flat list of menu items to group.
 * @returns An ordered array of `[categoryName, items[]]` tuples.
 */
function groupByCategory(items: MenuItem[]): [string, MenuItem[]][] {
  const map = new Map<string, MenuItem[]>();
  for (const item of items) {
    if (!map.has(item.category)) {
      map.set(item.category, []);
    }
    map.get(item.category)!.push(item);
  }
  return Array.from(map.entries());
}

/**
 * Generic, data-driven side-navigation menu component.
 *
 * Accepts two separate item arrays (`topItems` and `bottomItems`), groups each
 * array by its `category` field, and renders every group as a labeled section.
 * The expand/collapse animation, extension plugin rendering, and request-badge
 * display are handled internally; all business actions are supplied via props.
 *
 * @param props - Component props containing `topItems` and `bottomItems`.
 */
export function Menu({ topItems, bottomItems, pluginNodes }: Menu.Props) {
  const { app, Info } = Application.use();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Closes the menu when the user clicks outside of it. */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  /** Fetches the initial request list on mount. */
  useEffect(() => {
    Info.request_list();
  }, []);

  /**
   * Invokes the item's action callback and then collapses the menu.
   *
   * @param fn - The action callback to invoke, or `undefined` to skip.
   */
  const handleAction = (fn?: () => void) => {
    if (fn) fn();
    setIsOpen(false);
  };

  /**
   * Internal button component that applies the correct collapsed/expanded styling.
   *
   * @param props - Title, icon, onClick, optional children, and className overrides.
   */
  const ActionButton = ({
    title,
    icon,
    onClick,
    children,
    className,
  }: {
    title: string;
    icon: Icon.Name;
    onClick?: () => void;
    children?: React.ReactNode;
    className?: string;
  }) => (
    <Button
      variant="secondary"
      title={title}
      icon={icon}
      size="md"
      className={cn(className, s.actionBtn, isOpen && s.actionBtnExpanded)}
      onClick={() => handleAction(onClick)}
    >
      {isOpen && <span className={s.btnLabel}>{title}</span>}
      {children}
    </Button>
  );

  /**
   * Renders a list of `MenuItem` arrays grouped into labeled category sections.
   *
   * @param groups - Ordered `[categoryName, items[]]` tuples produced by `groupByCategory`.
   */
  const renderGroups = (groups: [string, MenuItem[]][]) =>
    groups.map(([category, items]) => (
      <Stack key={category} dir="column" gap={4} className={s.section}>
        {isOpen && <div className={s.sectionTitle}>{category}</div>}
        {items.map((item) => (
          <ActionButton
            key={item.label}
            title={item.label}
            icon={item.icon}
            onClick={item.action}
          />
        ))}
      </Stack>
    ));

  const topGroups = groupByCategory(topItems);
  const bottomGroups = groupByCategory(bottomItems);

  /**
   * Wraps each plugin node supplied via `pluginNodes` with the expand/collapse-aware
   * `pluginWrapper` styling. The wrapping must happen inside Menu because it depends
   * on the internal `isOpen` state.
   *
   * @param nodes - The raw plugin ReactNode(s) passed from the consumer.
   */
  const wrappedPluginItems = React.Children.map(pluginNodes, (child) => {
    if (React.isValidElement(child)) {
      const childElement = child as React.ReactElement<any>;
      const title = childElement.props.title as string | undefined;

      return (
        <div
          onClickCapture={() => setIsOpen(false)}
          className={cn(s.pluginWrapper, isOpen && s.pluginWrapperExpanded)}
        >
          {React.cloneElement(childElement, {
            props: {
              ...childElement.props.props,
              children: isOpen ? " " : undefined,
            },
          })}
          {isOpen && title && (
            <span className={s.pluginLabelOverlay}>{title}</span>
          )}
        </div>
      );
    }
    return child;
  });

  /** Count of active (pending/ongoing) requests for the badge indicator. */
  const activeRequestCount = app.general.requests.filter(
    (r) => r.status === "pending" || r.status === "ongoing",
  ).length;

  return (
    <div
      ref={menuRef}
      className={cn(s.menuWrapper, isOpen && s.menuWrapperExpanded)}
    >
      <Stack
        className={cn(s.menu, isOpen && s.expanded)}
        dir="column"
        ai={isOpen ? "stretch" : "flex-start"}
        gap={12}
      >
        {isOpen && (
          <Button
            variant="secondary"
            title="Close Menu"
            icon="ArrowLeft"
            size="md"
            onClick={() => setIsOpen(!isOpen)}
          ></Button>
        )}
        {!isOpen && (
          <Button
            variant="secondary"
            title="Expand Menu"
            icon="MenuAlt"
            size="md"
            className={cn(s.actionBtn, isOpen && s.actionBtnExpanded)}
            onClick={() => setIsOpen(!isOpen)}
          ></Button>
        )}

        <Stack
          ai={isOpen ? "stretch" : "center"}
          jc="flex-start"
          dir="column"
          gap={8}
          className={s.scroll}
        >
          {renderGroups(topGroups)}

          {wrappedPluginItems && wrappedPluginItems.length > 0 && (
            <Stack dir="column" gap={4} className={s.section}>
              {isOpen && (
                <div className={s.sectionTitle}>Plugins</div>
              )}
              {wrappedPluginItems}
            </Stack>
          )}
        </Stack>

        <Stack flex className={s.spacer} />

        <Stack
          dir="column"
          gap={8}
          ai={isOpen ? "stretch" : "center"}
          className={s.bottomArea}
        >
          {bottomGroups.map(([category, items]) => (
            <React.Fragment key={category}>
              {items.map((item) => {
                /** Special-case: the "Requests" item receives an activity badge. */
                const isRequestsItem = item.icon === "Activity";
                return (
                  <ActionButton
                    key={item.label}
                    title={item.label}
                    icon={item.icon}
                    onClick={item.action}
                    className={isRequestsItem ? s.requests : undefined}
                  >
                    {isRequestsItem && (
                      <span
                        className={cn(
                          s.requestsBadge,
                          isOpen && s.requestsBadgeExpanded,
                        )}
                      >
                        {activeRequestCount}
                      </span>
                    )}
                  </ActionButton>
                );
              })}
            </React.Fragment>
          ))}
        </Stack>
      </Stack>
    </div>
  );
}
