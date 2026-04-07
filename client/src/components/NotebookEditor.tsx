import { useState, useRef, useEffect, useCallback } from "react";
import { X, Eye, EyeOff, ImagePlus, PenTool, Palette, ArrowUpToLine, ArrowDownToLine, Trash2, Lock, Unlock, WrapText, Image as ImageIcon, RefreshCw, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechToText } from "@/hooks/useSpeechToText";

interface NotebookEditorProps {
  initialContent?: string;
  onClose: () => void;
  onSave: (content: string) => void;
}

interface ImageElement {
  id: string;
  src: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  textWrap: boolean;
  fit?: "cover" | "contain";
}

export default function NotebookEditor({ initialContent = "", onClose, onSave }: NotebookEditorProps) {
  const [showText, setShowText] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState("#000000");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const notebookRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const contentInitialized = useRef(false);
  const handleSpeechText = useCallback((text: string) => {
    setContent(prev => prev ? prev.trimEnd() + " " + text : text);
  }, []);
  const { isRecording, startRecording, stopRecording, supported: speechSupported } = useSpeechToText(handleSpeechText);

  const hasWrappedImages = images.some(img => img.textWrap);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 3;
        ctxRef.current = ctx;
      }
    }
  }, [isDrawingMode, images.length]);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = drawingColor;
    }
  }, [drawingColor]);

  useEffect(() => {
    if (hasWrappedImages) {
      if (editableRef.current) {
        editableRef.current.innerText = content;
        contentInitialized.current = true;
        requestAnimationFrame(() => {
          editableRef.current?.focus();
        });
      }
    } else {
      contentInitialized.current = false;
    }
  }, [hasWrappedImages]);

  useEffect(() => {
    if (!editableRef.current || !hasWrappedImages) return;
    const el = editableRef.current;
    
    el.querySelectorAll('[data-float-img]').forEach(node => node.remove());
    
    const wrapImages = images.filter(img => img.textWrap);
    wrapImages.forEach(img => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-float-img', img.id);
      wrapper.contentEditable = 'false';
      const side = img.x < 150 ? 'left' : 'right';
      const marginSide = side === 'left' ? 'margin: 0 16px 12px 0' : 'margin: 0 0 12px 16px';
      wrapper.style.cssText = `float: ${side}; width: ${img.width}px; ${marginSide}; border-radius: 8px; overflow: hidden; user-select: none; position: relative;`;
      
      if (selectedImage === img.id) {
        wrapper.style.outline = '2px solid hsl(var(--primary))';
        wrapper.style.outlineOffset = '2px';
      }
      
      const imgEl = document.createElement('img');
      imgEl.src = img.src;
      imgEl.draggable = false;
      imgEl.style.cssText = 'width: 100%; display: block; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
      wrapper.appendChild(imgEl);

      if (img.locked) {
        const lockBadge = document.createElement('div');
        lockBadge.style.cssText = 'position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); border-radius: 50%; padding: 4px; display: flex;';
        lockBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        wrapper.appendChild(lockBadge);
      }

      wrapper.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        setSelectedImage(img.id);
      });
      
      el.insertBefore(wrapper, el.firstChild);
    });
  }, [images, selectedImage, hasWrappedImages]);

  const handleContentInput = useCallback(() => {
    if (editableRef.current) {
      const clone = editableRef.current.cloneNode(true) as HTMLDivElement;
      clone.querySelectorAll('[data-float-img]').forEach(el => el.remove());
      setContent(clone.innerText);
    }
  }, []);

  const startDrawing = ({ nativeEvent }: any) => {
    if (!isDrawingMode || !ctxRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: any) => {
    if (!isDrawingMode || !isDrawing || !ctxRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingMode || !ctxRef.current) return;
    ctxRef.current.closePath();
    setIsDrawing(false);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBannerUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxZ = images.reduce((max, i) => Math.max(max, i.zIndex || 20), 20);
          const newImage: ImageElement = {
            id: `img-${Date.now()}`,
            src: event.target?.result as string,
            width: 200,
            height: (200 * img.height) / img.width,
            naturalWidth: img.width,
            naturalHeight: img.height,
            x: 20,
            y: 20,
            rotation: 0,
            zIndex: maxZ + 1,
            locked: false,
            textWrap: false,
          };
          setImages(prev => [...prev, newImage]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const updateImage = (id: string, updates: Partial<ImageElement>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const deleteImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage === id) setSelectedImage(null);
  };

  const handleSave = () => {
    const serialized = JSON.stringify({
      text: content,
      images,
      banner: bannerUrl,
    });
    onSave(serialized);
    onClose();
  };

  const freeImages = images.filter(img => !img.textWrap);

  if (showText) {
    return (
      <div className="fixed inset-x-0 top-0 bottom-[64px] sm:bottom-0 bg-black/50 z-50 flex items-end justify-center animate-in fade-in duration-300">
        <div className="bg-background rounded-t-3xl max-h-full overflow-y-auto w-full max-w-2xl animate-in slide-in-from-bottom duration-300 flex flex-col">
          <div className="sticky top-0 bg-background flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-serif text-xl">Visualização de Texto</h2>
            <button
              onClick={() => setShowText(false)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Eye size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-foreground">
                {content}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowText(false)}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Voltar ao Editor
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-bold"
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${window.scrollY}px`;
    const scrollY = window.scrollY;
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 bottom-[64px] sm:bottom-0 bg-black/50 z-50 flex items-end justify-center animate-in fade-in duration-300" onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}>
      <div className="bg-background rounded-t-3xl max-h-full overflow-hidden w-full max-w-2xl animate-in slide-in-from-bottom duration-300 flex flex-col overscroll-contain">
        <div className="sticky top-0 bg-background flex items-center justify-between p-6 border-b border-border z-10">
          <h2 className="font-serif text-xl">Caderno de Anotações</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowText(true)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Ver como texto"
            >
              <Eye size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-border overflow-x-auto items-center">
          
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors whitespace-nowrap flex items-center gap-1"
            title="Adicionar capa"
          >
            <ImageIcon size={14} />
            Capa
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <ImagePlus size={14} /> +
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={() => { setIsDrawingMode(!isDrawingMode); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
              isDrawingMode 
                ? "bg-primary text-primary-foreground shadow-inner" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <PenTool size={14} />
          </button>
          {isDrawingMode && (
            <input
              type="color"
              value={drawingColor}
              onChange={(e) => setDrawingColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-none p-0"
              title="Cor da caneta"
            />
          )}
          {speechSupported && !isDrawingMode && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title={isRecording ? "Parar gravação" : "Gravar áudio"}
                data-testid="button-voice-notebook"
              >
                {isRecording ? <Square size={14} /> : <Mic size={14} />}
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-notebook-pattern">
          <div
            ref={notebookRef}
            className="relative w-full min-h-[800px] bg-card mx-auto max-w-lg p-8 shadow-lg overflow-hidden"
            style={{
              backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
              backgroundSize: "100% 28px",
            }}
          >
            {isDrawingMode && (
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if(rect) {
                     startDrawing({ nativeEvent: { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top }});
                  }
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if(rect) {
                     draw({ nativeEvent: { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top }});
                  }
                }}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair"
                style={{ zIndex: 50 }}
              />
            )}

            {bannerUrl ? (
              <div className="mb-6 rounded-lg overflow-hidden shadow-md relative">
                <img src={bannerUrl} alt="Capa" className="w-full h-auto" />
                <div className="absolute top-2 left-2 z-10">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white bg-black/40 px-2 py-0.5 rounded-full">Capa</span>
                </div>
                <div className="absolute bottom-2 right-2 flex gap-2 z-10">
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all shadow-lg"
                    title="Trocar capa"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => setBannerUrl("")}
                    className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                    title="Remover capa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : null}

            {hasWrappedImages ? (
              <div 
                className="relative"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest('[data-float-img]')) {
                    setSelectedImage(null);
                    editableRef.current?.focus();
                  }
                }}
              >
                <div
                  ref={editableRef}
                  contentEditable={!isDrawingMode}
                  suppressContentEditableWarning
                  onInput={handleContentInput}
                  className={`w-full min-h-96 bg-transparent focus:outline-none font-serif text-base leading-7 ${
                    isDrawingMode ? "pointer-events-none opacity-60" : ""
                  }`}
                  style={{ lineHeight: "28px", whiteSpace: 'pre-wrap', wordWrap: 'break-word', position: 'relative', zIndex: 20, cursor: 'text' }}
                  data-placeholder="Escreva seus pensamentos aqui..."
                />
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setSelectedImage(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="Escreva seus pensamentos aqui..."
                  disabled={isDrawingMode}
                  className={`w-full min-h-96 bg-transparent border-none focus:outline-none font-serif text-base leading-7 resize-none placeholder:text-muted-foreground/50 ${
                    isDrawingMode ? "pointer-events-none opacity-50" : "pointer-events-auto"
                  }`}
                  style={{ lineHeight: "28px", position: 'relative', zIndex: 20 }}
                />
              </div>
            )}

            {freeImages.map((img) => (
              <div
                key={img.id}
                className={`absolute group ${img.locked ? "cursor-default" : "cursor-move"} ${selectedImage === img.id ? "ring-2 ring-primary" : ""} ${
                  isDrawingMode ? "pointer-events-none opacity-80" : "pointer-events-auto"
                }`}
                style={{
                  left: `${img.x}px`,
                  top: `${img.y}px`,
                  width: `${img.width}px`,
                  height: `${img.height}px`,
                  transform: `rotate(${img.rotation}deg)`,
                  touchAction: 'none',
                  zIndex: img.zIndex,
                }}
                onPointerDown={(e) => {
                  if (isDrawingMode) return;
                  e.stopPropagation();
                  setSelectedImage(img.id);
                  
                  if (img.locked) return;
                  
                  e.currentTarget.setPointerCapture(e.pointerId);
                  
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const initialImageX = img.x;
                  const initialImageY = img.y;

                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaY = moveEvent.clientY - startY;
                    
                    updateImage(img.id, { 
                      x: Math.max(0, initialImageX + deltaX), 
                      y: Math.max(0, initialImageY + deltaY) 
                    });
                  };

                  const handlePointerUp = (upEvent: PointerEvent) => {
                    document.removeEventListener("pointermove", handlePointerMove);
                    document.removeEventListener("pointerup", handlePointerUp);
                    const target = upEvent.target as HTMLElement;
                    if (target.releasePointerCapture) {
                      try { target.releasePointerCapture(upEvent.pointerId); } catch(e){}
                    }
                  };

                  document.addEventListener("pointermove", handlePointerMove);
                  document.addEventListener("pointerup", handlePointerUp);
                }}
              >
                <img
                  src={img.src}
                  alt="Note"
                  draggable={false}
                  className={`w-full h-full ${img.fit === 'contain' ? 'object-contain' : 'object-cover'} rounded-lg shadow-md border border-border pointer-events-none`}
                />

                {img.locked && (
                  <div className="absolute top-1 right-1 p-1 bg-black/50 rounded-full">
                    <Lock size={10} className="text-white" />
                  </div>
                )}

                {selectedImage === img.id && !isDrawingMode && !img.locked && (
                  <div
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 bg-primary/80 cursor-grab active:cursor-grabbing rounded-full flex items-center justify-center z-30"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      
                      const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                      const centerX = rect.left + rect.width / 2;
                      const centerY = rect.top + rect.height / 2;

                      const handlePointerMove = (moveEvent: PointerEvent) => {
                        const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
                        const degrees = (angle * 180) / Math.PI + 90;
                        updateImage(img.id, { rotation: degrees });
                      };

                      const handlePointerUp = (upEvent: PointerEvent) => {
                        document.removeEventListener("pointermove", handlePointerMove);
                        document.removeEventListener("pointerup", handlePointerUp);
                        const target = upEvent.target as HTMLElement;
                        if (target.releasePointerCapture) {
                          try { target.releasePointerCapture(upEvent.pointerId); } catch(e){}
                        }
                      };

                      document.addEventListener("pointermove", handlePointerMove);
                      document.addEventListener("pointerup", handlePointerUp);
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                )}

                {selectedImage === img.id && !isDrawingMode && !img.locked && (
                  <div
                    className="absolute bottom-0 right-0 w-6 h-6 bg-primary cursor-se-resize rounded-tl z-30 flex items-center justify-center"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startWidth = img.width;
                      const startHeight = img.height;

                      const handlePointerMove = (moveEvent: PointerEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaY = moveEvent.clientY - startY;
                        updateImage(img.id, {
                          width: Math.max(50, startWidth + deltaX),
                          height: Math.max(50, startHeight + deltaY),
                        });
                      };

                      const handlePointerUp = (upEvent: PointerEvent) => {
                        document.removeEventListener("pointermove", handlePointerMove);
                        document.removeEventListener("pointerup", handlePointerUp);
                        const target = upEvent.target as HTMLElement;
                        if (target.releasePointerCapture) {
                          try { target.releasePointerCapture(upEvent.pointerId); } catch(e){}
                        }
                      };

                      document.addEventListener("pointermove", handlePointerMove);
                      document.addEventListener("pointerup", handlePointerUp);
                    }}
                  />
                )}

                {selectedImage === img.id && !isDrawingMode && (
                  <div 
                    className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-1 z-30 bg-white/95 backdrop-blur p-1 rounded-full shadow-lg border border-border/50"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        updateImage(img.id, { locked: !img.locked });
                      }}
                      className={`p-2 rounded-full transition-colors touch-none ${
                        img.locked 
                          ? "bg-amber-50 text-amber-600" 
                          : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                      title={img.locked ? "Destrancar" : "Trancar"}
                    >
                      {img.locked ? <Lock size={15} strokeWidth={2.5} /> : <Unlock size={15} strokeWidth={2.5} />}
                    </button>
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        updateImage(img.id, { textWrap: true, zIndex: 10, rotation: 0 });
                      }}
                      className="p-2 bg-white text-teal-500 hover:bg-teal-50 hover:text-teal-600 rounded-full transition-colors touch-none"
                      title="Texto contorna imagem"
                    >
                      <WrapText size={15} strokeWidth={2.5} />
                    </button>
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const maxZ = images.reduce((max, i) => Math.max(max, i.zIndex || 20), 20);
                        updateImage(img.id, { zIndex: maxZ + 1 });
                      }}
                      className="p-2 bg-white text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors touch-none"
                      title="Trazer para frente"
                    >
                      <ArrowUpToLine size={15} strokeWidth={2.5} />
                    </button>
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        updateImage(img.id, { zIndex: 10 });
                      }}
                      className="p-2 bg-white text-orange-500 hover:bg-orange-50 hover:text-orange-600 rounded-full transition-colors touch-none"
                      title="Enviar para trás"
                    >
                      <ArrowDownToLine size={15} strokeWidth={2.5} />
                    </button>
                    <div className="w-[1px] h-6 bg-border/50 my-auto mx-0.5"></div>
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        deleteImage(img.id);
                      }}
                      className="p-2 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors touch-none"
                      title="Excluir"
                    >
                      <X size={15} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {images.filter(img => img.textWrap).map((img) => (
              selectedImage === img.id && !isDrawingMode && (
                <div 
                  key={`toolbar-${img.id}`}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-30 bg-white/95 backdrop-blur p-1 rounded-full shadow-lg border border-border/50"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      updateImage(img.id, { locked: !img.locked });
                    }}
                    className={`p-2 rounded-full transition-colors touch-none ${
                      img.locked 
                        ? "bg-amber-50 text-amber-600" 
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                    title={img.locked ? "Destrancar" : "Trancar"}
                  >
                    {img.locked ? <Lock size={15} strokeWidth={2.5} /> : <Unlock size={15} strokeWidth={2.5} />}
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      updateImage(img.id, { textWrap: false, zIndex: 20 });
                    }}
                    className="p-2 bg-teal-50 text-teal-600 rounded-full transition-colors touch-none"
                    title="Modo livre"
                  >
                    <WrapText size={15} strokeWidth={2.5} />
                  </button>
                  <div className="w-[1px] h-6 bg-border/50 my-auto mx-0.5"></div>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      deleteImage(img.id);
                    }}
                    className="p-2 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors touch-none"
                    title="Excluir"
                  >
                    <X size={15} strokeWidth={3} />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-background flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-bold"
          >
            Guardar Caderno
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
