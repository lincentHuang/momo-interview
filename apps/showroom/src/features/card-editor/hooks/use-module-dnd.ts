"use client";

import type { CardPlugin, CardSlot } from "@momo/merchant-card";
import { useRef, useState, type DragEvent, type RefObject } from "react";
import { findSlotTarget, isOverCard, moduleIdFromEvent, sameTarget, type SlotTarget } from "../lib/drop-target";

export interface DragSource {
  pluginId: string;
  /** palette：從模組面板拖入；card：拖曳卡片上已存在的模組 */
  source: "palette" | "card";
}

export type DropTarget = SlotTarget | { kind: "behavior" } | null;

const MIME = "application/x-momo-module";

/**
 * WYSIWYG 拖放狀態機（原生 HTML5 Drag and Drop）。
 *
 * 不用 dnd-kit 之類的函式庫：卡片內部在 Shadow DOM，函式庫的 sensor / collision 偵測拿不到內部節點；
 * 原生拖曳事件是 composed，搭配 composedPath() 與 shadowRoot 查詢即可完成命中判斷。
 * dragover 期間無法讀取 dataTransfer 內容（瀏覽器保護），所以拖曳來源另存在 ref。
 */
export function useModuleDnd({
  canvasRef,
  getPlugin,
  onPlace,
  onEnable,
  onRemove,
}: {
  canvasRef: RefObject<HTMLElement | null>;
  getPlugin: (id: string) => CardPlugin | undefined;
  onPlace: (id: string, slot: CardSlot, index: number) => void;
  onEnable: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const dragRef = useRef<DragSource | null>(null);
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [target, setTarget] = useState<DropTarget>(null);
  const [removeActive, setRemoveActive] = useState(false);

  const begin = (event: DragEvent, source: DragSource) => {
    dragRef.current = source;
    setDrag(source);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(MIME, source.pluginId);
    event.dataTransfer.setData("text/plain", source.pluginId);
  };

  const end = () => {
    dragRef.current = null;
    setDrag(null);
    setTarget(null);
    setRemoveActive(false);
  };

  const updateTarget = (next: DropTarget) =>
    setTarget((prev) => (prev?.kind === "slot" && next?.kind === "slot" ? (sameTarget(prev, next) ? prev : next) : prev?.kind === next?.kind ? prev : next));

  return {
    drag,
    target,
    removeActive,
    end,

    paletteDragStart: (event: DragEvent, pluginId: string) => begin(event, { pluginId, source: "palette" }),

    /** 卡片上的模組開始拖曳（事件來自 Shadow DOM 內的 [data-plugin-id]） */
    cardDragStart: (event: DragEvent) => {
      const pluginId = moduleIdFromEvent(event.nativeEvent);
      if (!pluginId) {
        event.preventDefault(); // 例如商品圖片的原生拖曳：在編輯器中沒有意義
        return;
      }
      begin(event, { pluginId, source: "card" });
    },

    canvasDragOver: (event: DragEvent) => {
      const source = dragRef.current;
      const canvas = canvasRef.current;
      const host = canvas?.querySelector<HTMLElement>("momo-product-card") ?? null;
      if (!source || !host || !canvas) return;
      const plugin = getPlugin(source.pluginId);
      if (!plugin) return;

      let next: DropTarget = null;
      if (plugin.render) next = findSlotTarget(host, canvas, source.pluginId, event.clientX, event.clientY);
      else if (isOverCard(host, event.clientX, event.clientY)) next = { kind: "behavior" };

      if (next) {
        event.preventDefault(); // 允許放置
        event.dataTransfer.dropEffect = "move";
      }
      updateTarget(next);
    },

    canvasDragLeave: (event: DragEvent) => {
      const canvas = canvasRef.current;
      if (canvas && !canvas.contains(event.relatedTarget as Node | null)) setTarget(null);
    },

    canvasDrop: (event: DragEvent) => {
      event.preventDefault();
      const source = dragRef.current;
      if (source && target?.kind === "slot") onPlace(source.pluginId, target.slot, target.index);
      if (source && target?.kind === "behavior") onEnable(source.pluginId);
      end();
    },

    removeDragOver: (event: DragEvent) => {
      if (dragRef.current?.source !== "card") return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setRemoveActive(true);
    },

    removeDrop: (event: DragEvent) => {
      event.preventDefault();
      const source = dragRef.current;
      if (source?.source === "card") onRemove(source.pluginId);
      end();
    },
  };
}
