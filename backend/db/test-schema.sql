CREATE TABLE public.users (
  id integer GENERATED ALWAYS AS IDENTITY,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  username character varying NOT NULL,
  password_hash text NOT NULL,
  role character varying DEFAULT 'staff'::character varying NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  can_access_services boolean DEFAULT false NOT NULL,
  can_access_policies boolean DEFAULT false NOT NULL,
  can_access_categories boolean DEFAULT false NOT NULL,
  profile_image text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_check
    CHECK (role::text = ANY (ARRAY['admin'::character varying, 'staff'::character varying]::text[])),
  CONSTRAINT users_username_key UNIQUE (username)
);

CREATE TABLE public.refresh_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY,
  user_id integer NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  revoked_at timestamp with time zone,
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.categories (
  id integer GENERATED ALWAYS AS IDENTITY,
  name character varying NOT NULL,
  type character varying NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_type_check CHECK (type IN ('service', 'policy')),
  CONSTRAINT categories_name_type_key UNIQUE (name, type)
);

CREATE UNIQUE INDEX idx_categories_one_default_per_type
  ON public.categories (type) WHERE is_default = true;

CREATE TABLE public.services (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title character varying(255) NOT NULL,
  url text NOT NULL,
  image text,
  sort_order integer NOT NULL DEFAULT 0,
  category_id integer NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description text,
  is_default boolean NOT NULL DEFAULT false
);

CREATE TABLE public.policies (
  id integer GENERATED ALWAYS AS IDENTITY,
  category_id integer NOT NULL,
  title character varying(255) NOT NULL,
  description text,
  file text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT policies_pkey PRIMARY KEY (id),
  CONSTRAINT policies_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT
);

CREATE INDEX idx_refresh_tokens_user_id
  ON public.refresh_tokens USING btree (user_id);

CREATE TABLE public.logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  username character varying(50),
  action character varying(50) NOT NULL,
  module character varying(50) NOT NULL,
  details text,
  ip_address inet,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_created_at ON public.logs (created_at DESC);
CREATE INDEX idx_logs_user_id ON public.logs (user_id);
