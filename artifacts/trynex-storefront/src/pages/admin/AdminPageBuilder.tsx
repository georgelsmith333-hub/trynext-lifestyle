import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Loader } from "@/components/ui/Loader";
import { getAuthHeaders } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  GripVertical, Eye, EyeOff, Edit2, Trash2, Plus, Save, 
  Layout, Image as ImageIcon, ShoppingBag, Info, MessageSquare, 
  BarChart3, ShieldCheck, Newspaper, MousePointer2, Megaphone,
  ChevronUp, ChevronDown
} from "lucide-react";

interface SectionConfig {
  id: string;
  type: string;
  visible: boolean;
  settings: Record<string, any>;
}

const SECTION_LIBRARY = [
  { type: "hero", name: "Hero Banner", icon: Layout, description: "Main promotional header" },
  { type: "categories", name: "Category Grid", icon: Layout, description: "Circular category links" },
  { type: "products", name: "Featured Products", icon: ShoppingBag, description: "Dynamic product grid" },
  { type: "how-it-works", name: "How It Works", icon: Info, description: "Step-by-step process" },
  { type: "testimonials", name: "Testimonials", icon: MessageSquare, description: "Customer reviews" },
  { type: "stats", name: "Stats Bar", icon: BarChart3, description: "Trust indicators & numbers" },
  { type: "trust-badges", name: "Trust Badges", icon: ShieldCheck, description: "Security & shipping badges" },
  { type: "blog", name: "Blog Previews", icon: Newspaper, description: "Recent articles" },
  { type: "cta", name: "CTA Banner", icon: Megaphone, description: "Call to action strip" },
  { type: "announcement", name: "Announcement Bar", icon: Megaphone, description: "Top scrolling ticker" },
];

export default function AdminPageBuilder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings({ 
    request: { headers: getAuthHeaders() }, 
    query: { staleTime: 0, refetchOnMount: "always" } as any 
  });
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings({
    request: { headers: getAuthHeaders() }
  });

  const [layout, setLayout] = useState<SectionConfig[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.homepage_layout) {
      try {
        const parsed = JSON.parse(settings.homepage_layout as string);
        if (Array.isArray(parsed)) setLayout(parsed);
      } catch (e) {
        console.error("Failed to parse homepage layout", e);
      }
    }
  }, [settings]);

  const saveLayout = async (newLayout: SectionConfig[]) => {
    try {
      await updateSettings({
        data: {
          homepage_layout: JSON.stringify(newLayout)
        } as any
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Layout saved successfully" });
    } catch (e) {
      toast({ title: "Failed to save layout", variant: "destructive" });
    }
  };

  const addSection = (type: string) => {
    const newSection: SectionConfig = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      visible: true,
      settings: {}
    };
    const next = [...layout, newSection];
    setLayout(next);
    setSelectedSectionId(newSection.id);
  };

  const removeSection = (id: string) => {
    const next = layout.filter(s => s.id !== id);
    setLayout(next);
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const toggleVisibility = (id: string) => {
    const next = layout.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
    setLayout(next);
  };

  const updateSectionSettings = (id: string, newSettings: Record<string, any>) => {
    const next = layout.map(s => s.id === id ? { ...s, settings: { ...s.settings, ...newSettings } } : s);
    setLayout(next);
  };

  // Drag and Drop (desktop)
  const dragOverTargetRef = { current: "" as string };
  const onDragStart = (id: string) => setDraggingId(id);
  const onDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!draggingId || draggingId === targetId || dragOverTargetRef.current === targetId) return;
    dragOverTargetRef.current = targetId;
    setLayout(prev => {
      const draggingIdx = prev.findIndex(s => s.id === draggingId);
      const targetIdx = prev.findIndex(s => s.id === targetId);
      if (draggingIdx === -1 || targetIdx === -1) return prev;
      const next = [...prev];
      const [removed] = next.splice(draggingIdx, 1);
      next.splice(targetIdx, 0, removed);
      return next;
    });
  };
  const onDragEnd = () => { setDraggingId(null); dragOverTargetRef.current = ""; };

  // Touch-based reorder helpers for mobile
  const moveUp = (id: string) => setLayout(prev => {
    const idx = prev.findIndex(s => s.id === id);
    if (idx <= 0) return prev;
    const next = [...prev];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    return next;
  });
  const moveDown = (id: string) => setLayout(prev => {
    const idx = prev.findIndex(s => s.id === id);
    if (idx >= prev.length - 1) return prev;
    const next = [...prev];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    return next;
  });

  const selectedSection = layout.find(s => s.id === selectedSectionId);

  if (isLoading) return <AdminLayout><Loader /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Page Builder</h1>
            <p className="text-sm text-gray-500">Drag and drop to manage your homepage sections.</p>
          </div>
          <button
            onClick={() => saveLayout(layout)}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* Left Sidebar - Library */}
          <div className="lg:w-64 w-full bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col lg:max-h-none max-h-48">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-xs uppercase tracking-widest text-gray-500">
              Available Sections
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {SECTION_LIBRARY.map(item => (
                <button
                  key={item.type}
                  onClick={() => addSection(item.type)}
                  className="w-full text-left p-3 rounded-xl border border-transparent hover:border-orange-200 hover:bg-orange-50 group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-white flex items-center justify-center text-gray-500 group-hover:text-orange-600 transition-colors">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{item.name}</div>
                      <div className="text-[10px] text-gray-400 leading-tight">{item.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center - Layout */}
          <div className="flex-1 bg-gray-100/50 border border-gray-200 rounded-2xl p-4 lg:p-6 overflow-y-auto">
            <div className="max-w-xl mx-auto space-y-3">
              {layout.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-3xl">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Your page is empty</h3>
                  <p className="text-sm text-gray-500 mt-1">Add sections from the library to get started.</p>
                </div>
              )}
              {layout.map((section, idx) => {
                const libInfo = SECTION_LIBRARY.find(l => l.type === section.type);
                return (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => onDragStart(section.id)}
                    onDragOver={(e) => onDragOver(e, section.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setSelectedSectionId(section.id)}
                    className={`
                      group relative flex items-center gap-3 p-4 bg-white border rounded-2xl transition-all cursor-move select-none
                      ${selectedSectionId === section.id ? 'border-orange-400 ring-2 ring-orange-50' : 'border-gray-200 hover:border-gray-300 shadow-sm'}
                      ${draggingId === section.id ? 'opacity-40 scale-[0.98]' : ''}
                      ${!section.visible ? 'bg-gray-50/50 grayscale opacity-60' : ''}
                    `}
                  >
                    <div className="hidden sm:block text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    {/* Mobile up/down arrows */}
                    <div className="flex sm:hidden flex-col gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); moveUp(section.id); }} disabled={idx === 0}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveDown(section.id); }} disabled={idx === layout.length - 1}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                      {libInfo?.icon ? <libInfo.icon className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{libInfo?.name || section.type}</div>
                      <div className="text-[10px] text-gray-400 font-medium">Position {idx + 1} of {layout.length}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id); }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title={section.visible ? "Hide section" : "Show section"}
                      >
                        {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Delete section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar - Settings */}
          <div className="lg:w-80 w-full bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-xs uppercase tracking-widest text-gray-500">
              Section Settings
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {selectedSection ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                      {(() => {
                        const Icon = SECTION_LIBRARY.find(l => l.type === selectedSection.type)?.icon || Layout;
                        return <Icon className="w-5 h-5" />;
                      })()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {SECTION_LIBRARY.find(l => l.type === selectedSection.type)?.name}
                      </div>
                      <div className="text-xs text-gray-400">Editing configuration</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
                        Section Title
                      </label>
                      <input
                        type="text"
                        value={selectedSection.settings.title || ""}
                        onChange={(e) => updateSectionSettings(selectedSection.id, { title: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
                        placeholder="Main title text"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
                        Background Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedSection.settings.bgColor || "#ffffff"}
                          onChange={(e) => updateSectionSettings(selectedSection.id, { bgColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-gray-200 p-0.5"
                        />
                        <input
                          type="text"
                          value={selectedSection.settings.bgColor || "#ffffff"}
                          onChange={(e) => updateSectionSettings(selectedSection.id, { bgColor: e.target.value })}
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
                        Padding (Vertical)
                      </label>
                      <select
                        value={selectedSection.settings.padding || "md"}
                        onChange={(e) => updateSectionSettings(selectedSection.id, { padding: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                      >
                        <option value="none">None</option>
                        <option value="sm">Small (py-8)</option>
                        <option value="md">Medium (py-16)</option>
                        <option value="lg">Large (py-24)</option>
                        <option value="xl">Extra Large (py-32)</option>
                      </select>
                    </div>

                    {selectedSection.type === 'cta' && (
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
                          Button Link
                        </label>
                        <input
                          type="text"
                          value={selectedSection.settings.buttonLink || "/products"}
                          onChange={(e) => updateSectionSettings(selectedSection.id, { buttonLink: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                          placeholder="/products"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <button
                      onClick={() => saveLayout(layout)}
                      className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Section
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <MousePointer2 className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Select a section in the layout<br/>to edit its settings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
