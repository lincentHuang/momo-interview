// 共用 UI primitives：以 Radix Primitives 為行為底層（a11y / 鍵盤操作 / focus 管理），樣式由 Tailwind tokens 決定。
// feature 只能從這裡引用 UI，不直接依賴 radix-ui，方便日後替換或統一調整。
export { Accordion, AccordionItem, AccordionTrigger } from "./accordion";
export { Button, type ButtonProps } from "./button";
export { Dialog, DialogClose } from "./dialog";
export { Drawer, DrawerClose } from "./drawer";
export * from "./icons";
export { Input } from "./input";
export { Label } from "./label";
export { Select, type SelectOption, type SelectProps } from "./select";
export { Slider } from "./slider";
export { Switch } from "./switch";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
export { ToggleGroup } from "./toggle-group";
export { Tooltip, TooltipProvider } from "./tooltip";
