import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Guidelines } from './parts';

const CORE_SWATCHES = [
  { name: 'Primary', className: 'bg-primary' },
  { name: 'Secondary', className: 'bg-secondary' },
  { name: 'Accent', className: 'bg-accent' },
] as const;

const SUPPORTING_SWATCHES = [
  { name: 'Background', className: 'border bg-background' },
  { name: 'Foreground', className: 'bg-foreground' },
  { name: 'Muted', className: 'bg-muted' },
  { name: 'Destructive', className: 'bg-destructive' },
  { name: 'Border', className: 'bg-border' },
  { name: 'Trust green', className: 'bg-success' },
  { name: 'Navy', className: 'bg-navy' },
] as const;

const TYPE_SCALE = [
  { label: 'Display', className: 'text-4xl font-bold' },
  { label: 'Heading', className: 'text-2xl font-semibold' },
  { label: 'Body', className: 'text-base' },
  { label: 'Label', className: 'text-sm font-medium' },
  { label: 'Caption', className: 'text-sm text-muted-foreground' },
] as const;

const SPACING_SCALE = [
  { label: '4', className: 'w-4' },
  { label: '8', className: 'w-8' },
  { label: '12', className: 'w-12' },
  { label: '16', className: 'w-16' },
  { label: '24', className: 'w-24' },
] as const;

function Swatch({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <div className={`h-16 rounded-lg ${className}`} />
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-navy p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <Badge className="border-0 bg-orange text-white">Custom made in Bangladesh</Badge>
            <h2 className="mt-5 font-sans text-4xl font-bold tracking-tight sm:text-5xl">
              Made to feel like yours.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
              Trynext is warm, practical, and a little expressive. Use orange to invite action,
              green to make delivery and payment feel trustworthy, and generous white space to
              let the product lead.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">System promise</p>
            <p className="mt-2 text-sm font-semibold">Clear choices. Confident checkout.</p>
          </div>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Core palette
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Typography
          </h2>
          <div className="mt-4 space-y-3">
            {TYPE_SCALE.map((entry) => (
              <p key={entry.label} className={entry.className}>
                {entry.label}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            In use
          </h2>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Make something personal</CardTitle>
              <CardDescription>
                Components composed from the shared Trynext tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="overview-name">Design name</Label>
                <Input id="overview-name" placeholder="Weekend crew tee" />
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked id="overview-notify" />
                <Label htmlFor="overview-notify">Show delivery updates</Label>
                <Badge className="ml-auto bg-accent text-accent-foreground">Trusted</Badge>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button>Start designing</Button>
              <Button variant="outline">View products</Button>
            </CardFooter>
          </Card>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Components
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>
    </div>
  );
}

export function BrandPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Personality</p>
        <h2 className="mt-3 text-2xl font-bold">Warm, capable, and proudly local.</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Trynext should feel like a helpful maker who knows the details. Be direct about price,
          delivery, and production. Add small moments of delight through color, helpful previews,
          and human language—not through visual noise.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Invite', 'Orange is the “go ahead” color for shop, customize, add to cart, and continue.'],
          ['Reassure', 'Green marks delivery, payment, stock, and other moments where trust matters.'],
          ['Ground', 'Navy anchors the brand in a calm, premium foundation for hero and admin surfaces.'],
        ].map(([title, body]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Composition rules</h2>
        <div className="mt-4">
          <Guidelines
            items={[
              { kind: 'do', text: 'Lead with one clear action and one supporting action.' },
              { kind: 'do', text: 'Show the product on clean, warm-neutral surfaces with room to breathe.' },
              { kind: 'do', text: 'Use Bangladesh-green for real reassurance, not generic decoration.' },
              { kind: 'dont', text: 'Do not use orange for warnings or destructive actions.' },
              { kind: 'dont', text: 'Do not stack multiple competing primary buttons in one region.' },
              { kind: 'dont', text: 'Do not hide price, delivery, or payment expectations behind vague copy.' },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Brand colors</h2>
          <p className="text-sm text-muted-foreground">
            The core roles used for emphasis, supporting actions, and accents.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Semantic and surface colors</h2>
          <p className="text-sm text-muted-foreground">
            Roles for text, backgrounds, borders, muted content, and danger.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SUPPORTING_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Font family
        </h2>
        <p className="mt-4 text-4xl font-bold">The quick brown fox</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The token font family is applied across this entire preview.
        </p>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Type scale
        </h2>
        {TYPE_SCALE.map((entry) => (
          <div key={entry.label} className="grid gap-2 sm:grid-cols-[88px_1fr]">
            <span className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {entry.label}
            </span>
            <p className={entry.className}>Build products people understand.</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function LayoutPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Spacing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The spacing scale, derived from the base spacing token.
        </p>
        <div className="mt-6 space-y-4">
          {SPACING_SCALE.map((space) => (
            <div key={space.label} className="flex items-center gap-4">
              <span className="w-8 text-xs text-muted-foreground">
                {space.label}
              </span>
              <div className={`h-3 rounded-full bg-primary ${space.className}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Radius</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Corner treatments derive from the base radius token.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Small', className: 'rounded-sm' },
            { label: 'Medium', className: 'rounded-md' },
            { label: 'Large', className: 'rounded-lg' },
            { label: 'Extra large', className: 'rounded-xl' },
          ].map((radius) => (
            <div
              key={radius.label}
              className={`flex h-24 items-end border bg-muted p-3 ${radius.className}`}
            >
              <span className="text-xs font-medium">{radius.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AppliedExamplesPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex aspect-[4/3] items-end bg-gradient-to-br from-secondary via-background to-accent p-6">
            <div className="w-full rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary">Bestseller</Badge>
                  <h2 className="mt-3 text-xl font-bold">Custom Classic Tee</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Soft cotton · Your design · From ৳650</p>
                </div>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  4.9 ★
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm">Customize</Button>
                <Button size="sm" variant="outline">Quick view</Button>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery promise</CardTitle>
            <CardDescription>Trust cues stay specific and close to the decision.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['✓', 'Fast delivery', 'All 64 districts'],
              ['✓', 'Pay 25% advance', 'Balance on delivery'],
              ['✓', 'Made for you', 'Preview before ordering'],
            ].map(([icon, title, body]) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button className="w-full">Continue to checkout</Button>
          </CardFooter>
        </Card>
      </div>
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Responsive retail rhythm</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          On mobile, preserve the same order: product → price → trust cue → primary action.
          Collapse navigation before compressing the product story, and keep touch targets at
          least 44px high.
        </p>
      </section>
    </div>
  );
}
