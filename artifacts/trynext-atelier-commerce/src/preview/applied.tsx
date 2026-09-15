import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  ImagePlus,
  Info,
  Layers3,
  Sparkles,
  Tag,
  WandSparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Guidelines } from './parts';

const BASE = import.meta.env.BASE_URL;
const image = (name: string) => `${BASE}references/${name}`;

const mockups = [
  { label: 'Front', src: image('mug-white-front.png'), selected: true },
  { label: 'Back', src: image('mug-white-back.png'), selected: false },
  { label: 'Left side', src: image('mug-white-back.png'), selected: false },
  { label: 'Right side', src: image('mug-white-front.png'), selected: false },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function StatusPill({
  children,
  tone = 'ready',
}: {
  children: React.ReactNode;
  tone?: 'ready' | 'neutral';
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        tone === 'ready'
          ? 'bg-accent text-accent-foreground'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {tone === 'ready' ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

export function MockupLibraryPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="border-b px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Eyebrow>Selected mockups · 11 oz ceramic mug</Eyebrow>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                  Choose the moments that sell the product
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Side-aware product views first. Context scenes add confidence
                  after the actual product angles are covered.
                </p>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View all mockups
              </Button>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto border-b px-5 py-5">
            {mockups.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`group min-w-[108px] rounded-xl border p-2 text-left transition ${
                  item.selected
                    ? 'border-primary bg-secondary ring-2 ring-primary/20'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
                  <img
                    className="h-full w-full object-contain"
                    src={item.src}
                    alt={`${item.label} mug mockup`}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold">{item.label}</p>
              </button>
            ))}
            <button
              type="button"
              className="min-w-[108px] rounded-xl border border-dashed border-border bg-muted/30 p-2 text-left"
            >
              <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
              </div>
              <p className="mt-2 text-xs font-semibold">My uploads</p>
            </button>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-2xl border bg-[#fffefa] p-6">
              <div className="flex items-center justify-between">
                <StatusPill>Primary</StatusPill>
                <span className="text-xs text-muted-foreground">11 oz</span>
              </div>
              <div className="mt-5 flex min-h-[300px] items-center justify-center rounded-xl bg-[#f5f1ea] p-4">
                <img
                  className="max-h-[270px] w-full object-contain drop-shadow-[0_22px_22px_rgba(74,52,37,0.13)]"
                  src={image('mug-white-front.png')}
                  alt="Primary mug mockup"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Front, 11 oz</p>
                  <p className="text-xs text-muted-foreground">
                    Reviewed photo · artwork-safe body zone
                  </p>
                </div>
                <Button size="sm">Select</Button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Eyebrow>Library controls</Eyebrow>
                <p className="mt-2 text-sm font-semibold">Show in listing</p>
              </div>
              {['Primary product angle', 'Side 2', 'Lifestyle context'].map(
                (label, index) => (
                  <label
                    key={label}
                    className="flex items-center gap-3 rounded-xl border bg-background p-3"
                  >
                    <Switch defaultChecked={index < 2} />
                    <span className="min-w-0 flex-1 text-xs font-medium">
                      {label}
                    </span>
                    <ChevronDown className="h-4 w-4 rotate-[-90deg] text-muted-foreground" />
                  </label>
                ),
              )}
              <div className="rounded-xl bg-accent/70 p-3 text-xs leading-5 text-accent-foreground">
                <Info className="mb-1 h-4 w-4" />
                Keep the front/back/side set complete before adding lifestyle
                scenes. Buyers understand the product faster.
              </div>
            </div>
          </div>
        </section>

        <Card className="h-fit">
          <CardHeader>
            <Eyebrow>Selected mockups</Eyebrow>
            <CardTitle className="text-lg">4 of 15 selected</CardTitle>
            <CardDescription>
              The listing will lead with the primary angle, then show the
              actual side set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockups.map((item) => (
              <div
                key={`selected-${item.label}`}
                className="flex items-center gap-3 rounded-xl border bg-background p-2"
              >
                <img
                  className="h-14 w-14 rounded-lg bg-white object-contain"
                  src={item.src}
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    {item.label}, 11 oz
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Product view
                  </p>
                </div>
                <Check className="h-4 w-4 text-accent-foreground" />
              </div>
            ))}
            <Button className="w-full">
              Save selection <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Eyebrow>Composition rules</Eyebrow>
          <CardTitle className="text-lg">The product remains the hero</CardTitle>
        </CardHeader>
        <CardContent>
          <Guidelines
            items={[
              { kind: 'do', text: 'Lead with real front/back/side photography before contextual scenes.' },
              { kind: 'do', text: 'Keep the product edge and soft shadow visible against warm-white surfaces.' },
              { kind: 'dont', text: 'Use a generic cylinder or infer a full wrap from artwork appearing on two faces.' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function ListingComposerPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Creator workflow · step 2 of 4</Eyebrow>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            Turn a finished design into a listing people can find
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Keep the buyer outcome visible while the creator adds story,
            search intent, pricing, and publish details.
          </p>
        </div>
        <StatusPill>Ready for review</StatusPill>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <Eyebrow>Listing details</Eyebrow>
                <CardTitle className="mt-2 text-xl">
                  Give the design a useful story
                </CardTitle>
              </div>
              <Button variant="outline" size="sm">
                <WandSparkles className="mr-2 h-4 w-4" />
                Improve listing
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-secondary p-3 text-xs text-secondary-foreground">
              <Sparkles className="h-4 w-4 shrink-0" />
              Automatic optimization is enabled. Review every suggestion before
              publishing.
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="listing-title">Title</Label>
              <Input
                id="listing-title"
                defaultValue="Geometric Fox & Sunburst Illustration Mug"
              />
              <p className="text-xs text-muted-foreground">
                54 / 140 characters · clear product + design intent
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-description">Description</Label>
              <Textarea
                id="listing-description"
                className="min-h-[150px]"
                defaultValue="A quiet morning ritual, wrapped in warm color. This glossy ceramic mug pairs a geometric fox with a sunburst motif for coffee breaks, thoughtful gifts, and everyday shelves."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-tags">Search tags</Label>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="listing-tags"
                  className="border-0 px-0 shadow-none focus-visible:ring-0"
                  defaultValue="geometric fox, ceramic mug, woodland gift, cozy coffee"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use specific phrases buyers would actually type. Avoid keyword
                stuffing.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-semibold">Add size table to description</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Useful for apparel; optional for this 11 oz mug.
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <Eyebrow>Publish readiness</Eyebrow>
              <CardTitle className="text-lg">3 of 4 checks complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={75} />
              {[
                ['Mockup set', true],
                ['Listing copy', true],
                ['Pricing & margin', true],
                ['Store destination', false],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      done ? 'bg-accent text-accent-foreground' : 'border border-border'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className={done ? 'font-medium' : 'text-muted-foreground'}>
                    {label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Eyebrow>Pricing</Eyebrow>
              <CardTitle className="text-lg">Healthy margin, visible math</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Retail price', '$18.00'],
                ['Production cost', '$6.40'],
                ['Estimated profit', '$11.60'],
              ].map(([label, value], index) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={index === 2 ? 'font-bold text-accent-foreground' : 'font-semibold'}>
                    {value}
                  </span>
                </div>
              ))}
              <Separator />
              <p className="text-xs leading-5 text-muted-foreground">
                Buyer shipping is separated from product margin so the creator
                can make an informed publish decision.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function BuyerPreviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Applied buyer surface</Eyebrow>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            The published result should feel calmer than the editor
          </h2>
        </div>
        <Button variant="outline">
          <Layers3 className="mr-2 h-4 w-4" />
          Open creator view
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="rounded-2xl border bg-[#f4efe8] p-5">
          <div className="flex items-center justify-between">
            <StatusPill>Verified product preview</StatusPill>
            <span className="text-xs text-muted-foreground">1 / 4</span>
          </div>
          <div className="mt-5 flex min-h-[480px] items-center justify-center rounded-xl bg-[#fffdf9] p-6">
            <img
              className="max-h-[400px] w-full object-contain drop-shadow-[0_28px_30px_rgba(74,52,37,0.16)]"
              src={image('mug-white-front.png')}
              alt="Geometric fox ceramic mug"
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {mockups.map((item) => (
              <div key={`buyer-${item.label}`} className="rounded-lg border bg-white p-1">
                <img className="aspect-square w-full object-contain" src={item.src} alt="" />
              </div>
            ))}
          </div>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-4 w-4" />
              Made for everyday rituals
            </div>
            <div>
              <h3 className="font-serif text-3xl font-semibold leading-tight">
                Geometric Fox & Sunburst Illustration Mug
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">11 oz · Ceramic · Ships from Bangladesh</p>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold">$18.00</span>
              <span className="mb-1 text-sm text-muted-foreground">or ৳2,160</span>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Choose a side to preview</Label>
              <div className="grid grid-cols-3 gap-2">
                {['Side 1', 'Side 2', 'Full Wrap'].map((label, index) => (
                  <Button key={label} variant={index === 0 ? 'default' : 'outline'} size="sm">
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-accent p-4 text-sm text-accent-foreground">
              <p className="font-semibold">Personalization available</p>
              <p className="mt-1 text-xs leading-5">
                Add a name or note at checkout. Your preview stays tied to the
                actual photographed product.
              </p>
            </div>
            <Button className="w-full" size="lg">
              Add to cart <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secure checkout · 25% advance on COD · Free shipping over ৳2,000
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}