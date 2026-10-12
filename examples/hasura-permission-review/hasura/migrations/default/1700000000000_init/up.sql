CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  owner_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  org_id uuid NOT NULL,
  total_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  -- Payment-provider token for the stored card; must never reach clients.
  payment_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);
