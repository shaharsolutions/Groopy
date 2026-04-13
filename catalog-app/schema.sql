


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "image" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text"
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    "image" "text" NOT NULL,
    "target_type" "text" DEFAULT 'none'::"text",
    "target_value" "text",
    "is_active" boolean DEFAULT true,
    "order_index" integer DEFAULT 0,
    "pos_x" integer DEFAULT 50,
    "pos_y" integer DEFAULT 50,
    "zoom" double precision DEFAULT 1.0,
    "object_fit" "text" DEFAULT 'cover'::"text"
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


COMMENT ON COLUMN "public"."banners"."pos_x" IS 'Horizontal position of the image in percentage (0-100)';



COMMENT ON COLUMN "public"."banners"."pos_y" IS 'Vertical position of the image in percentage (0-100)';



COMMENT ON COLUMN "public"."banners"."zoom" IS 'Zoom level of the image (1.0 = normal)';



COMMENT ON COLUMN "public"."banners"."object_fit" IS 'CSS object-fit property value (cover, contain, fill)';



CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "logo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" "text",
    "show_in_carousel" boolean DEFAULT true
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "order_index" integer DEFAULT 0
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "business_name" "text" NOT NULL,
    "contact_name" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "additional_contacts" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "customer_name" "text" NOT NULL,
    "items" "jsonb" NOT NULL,
    "total_price" numeric NOT NULL,
    "agent_id" "text",
    "agent_name" "text",
    "status" "text" DEFAULT 'New'::"text",
    "notes" "jsonb" DEFAULT '[]'::"jsonb",
    "discount_pct" numeric DEFAULT 0,
    "customer_note" "text",
    "wa_confirmation_status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."wa_confirmation_status" IS 'Tracks if the customer confirmed sending the WhatsApp message: pending, confirmed, not_sent';



CREATE TABLE IF NOT EXISTS "public"."personalized_links" (
    "id" integer NOT NULL,
    "agent_id" character varying(255),
    "categories" "text"[],
    "banners" "uuid"[],
    "expires_at" bigint,
    "description" "text",
    "views" integer DEFAULT 0,
    "views_inactive" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."personalized_links" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."personalized_links_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."personalized_links_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."personalized_links_id_seq" OWNED BY "public"."personalized_links"."id";



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sku" "text" NOT NULL,
    "price" numeric NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_new" boolean DEFAULT false,
    "is_best_seller" boolean DEFAULT false,
    "is_hot_deal" boolean DEFAULT false,
    "is_clearing" boolean DEFAULT false,
    "default_quantity" integer DEFAULT 12,
    "is_default_carton" boolean DEFAULT false,
    "is_incremental_add" boolean DEFAULT false,
    "incremental_step" numeric
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."incremental_step" IS 'The amount of units to add on each subsequent click after the initial carton addition.';



ALTER TABLE ONLY "public"."personalized_links" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."personalized_links_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_business_name_key" UNIQUE ("business_name");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personalized_links"
    ADD CONSTRAINT "personalized_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_customers_business_name" ON "public"."customers" USING "btree" ("business_name");



CREATE INDEX "idx_customers_email" ON "public"."customers" USING "btree" ("email");



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE POLICY "Allow all access to authenticated users" ON "public"."customers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anon to upsert customers" ON "public"."customers" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public delete access" ON "public"."categories" FOR DELETE USING (true);



CREATE POLICY "Allow public delete access on agents" ON "public"."agents" FOR DELETE USING (true);



CREATE POLICY "Allow public delete access on products" ON "public"."products" FOR DELETE USING (true);



CREATE POLICY "Allow public delete of personalized links" ON "public"."personalized_links" FOR DELETE USING (true);



CREATE POLICY "Allow public deletes" ON "public"."orders" FOR DELETE USING (true);



CREATE POLICY "Allow public insert access" ON "public"."categories" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert access on agents" ON "public"."agents" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert access on products" ON "public"."products" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert of personalized links" ON "public"."personalized_links" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public inserts" ON "public"."orders" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on agents" ON "public"."agents" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Allow public read of personalized links" ON "public"."personalized_links" FOR SELECT USING (true);



CREATE POLICY "Allow public selects" ON "public"."orders" FOR SELECT USING (true);



CREATE POLICY "Allow public update access" ON "public"."categories" FOR UPDATE USING (true);



CREATE POLICY "Allow public update access on agents" ON "public"."agents" FOR UPDATE USING (true);



CREATE POLICY "Allow public update access on products" ON "public"."products" FOR UPDATE USING (true);



CREATE POLICY "Allow public update of personalized links" ON "public"."personalized_links" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow public updates" ON "public"."orders" FOR UPDATE USING (true);



CREATE POLICY "Enable all access for everyone" ON "public"."banners" USING (true) WITH CHECK (true);



CREATE POLICY "Enable delete for all users" ON "public"."brands" FOR DELETE USING (true);



CREATE POLICY "Enable insert for all users" ON "public"."brands" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."brands" FOR SELECT USING (true);



CREATE POLICY "Enable update for all users" ON "public"."brands" FOR UPDATE USING (true);



ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personalized_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."personalized_links" TO "anon";
GRANT ALL ON TABLE "public"."personalized_links" TO "authenticated";
GRANT ALL ON TABLE "public"."personalized_links" TO "service_role";



GRANT ALL ON SEQUENCE "public"."personalized_links_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."personalized_links_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."personalized_links_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































