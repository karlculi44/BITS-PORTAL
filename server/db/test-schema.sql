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

CREATE INDEX idx_refresh_tokens_user_id
  ON public.refresh_tokens USING btree (user_id);
