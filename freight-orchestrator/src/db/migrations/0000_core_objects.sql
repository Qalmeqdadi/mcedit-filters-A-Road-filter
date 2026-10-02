CREATE TYPE "public"."bid_status" AS ENUM('invited', 'chased', 'replied', 'superseded', 'declined', 'no_reply');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('requested', 'confirmed', 'amended', 'cancelled', 'rolled');--> statement-breakpoint
CREATE TYPE "public"."capacity_hold_status" AS ENUM('held', 'converted', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('email', 'pdf', 'chat', 'api', 'portal', 'edi', 'phone');--> statement-breakpoint
CREATE TYPE "public"."charge_category" AS ENUM('freight', 'surcharge', 'origin', 'destination', 'inland', 'customs', 'insurance');--> statement-breakpoint
CREATE TYPE "public"."charge_status" AS ENUM('expected', 'incurred', 'invoiced', 'disputed', 'settled', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."counterparty" AS ENUM('shipper', 'carrier', 'partner');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('requested', 'uploaded', 'extracted', 'validated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."exception_status" AS ENUM('detected', 'owned', 'in_progress', 'resolved', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."mode" AS ENUM('ocean_fcl', 'ocean_lcl', 'air', 'road', 'rail');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('desk', 'shipper', 'carrier', 'partner', 'platform');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('issued', 'pending_approval', 'sent', 'accepted', 'rejected', 'countered', 'expired', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."rate_kind" AS ENUM('contract', 'tender', 'spot', 'tariff');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('draft', 'awaiting_info', 'validated', 'out_to_carriers', 'options_ready', 'quoted', 'won', 'lost', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('planned', 'in_transit', 'at_destination', 'delivered', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"party_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"actor_org_id" text,
	"actor_version" text,
	"action" text NOT NULL,
	"process" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"outcome" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"rule_versions" text[] DEFAULT '{}'::text[] NOT NULL,
	"model_version" text,
	"override_of" uuid,
	"override_reason" text,
	"desk_org_id" text
);
--> statement-breakpoint
CREATE TABLE "bid" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"carrier_org_id" text NOT NULL,
	"status" "bid_status" DEFAULT 'invited' NOT NULL,
	"channel" "channel" NOT NULL,
	"supersedes_bid_id" uuid,
	"raw_reply" text,
	"price" numeric(14, 2),
	"currency" text,
	"cost_lines" jsonb,
	"chase_count" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"shipper_org_id" text NOT NULL,
	"carrier_org_id" text NOT NULL,
	"carrier_ref" text,
	"status" "booking_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capacity_hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"carrier_org_id" text NOT NULL,
	"units" integer NOT NULL,
	"status" "capacity_hold_status" DEFAULT 'held' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capacity_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"carrier_org_id" text NOT NULL,
	"equipment" text NOT NULL,
	"free_units" integer NOT NULL,
	"as_of" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargo_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"description" text NOT NULL,
	"hs_code" text,
	"pieces" integer NOT NULL,
	"package_type" text,
	"length_cm" real,
	"width_cm" real,
	"height_cm" real,
	"gross_weight_kg" real NOT NULL,
	"volume_m3" real,
	"stackable" boolean DEFAULT true NOT NULL,
	"dg_class" text,
	"un_number" text,
	"temp_min_c" real,
	"temp_max_c" real
);
--> statement-breakpoint
CREATE TABLE "charge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"carrier_org_id" text,
	"charge_code" text NOT NULL,
	"cost" numeric(14, 2) NOT NULL,
	"sell" numeric(14, 2),
	"currency" text NOT NULL,
	"status" charge_status DEFAULT 'expected' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charge_code" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" charge_category NOT NULL,
	"basis" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "desk_relationship" (
	"desk_org_id" text NOT NULL,
	"party_id" text NOT NULL,
	"terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"shipment_id" uuid,
	"desk_org_id" text NOT NULL,
	"shipper_org_id" text,
	"type" text NOT NULL,
	"status" "document_status" DEFAULT 'requested' NOT NULL,
	"filename" text,
	"storage_key" text,
	"extracted" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"code" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"shipper_org_id" text NOT NULL,
	"carrier_org_id" text,
	"type" text NOT NULL,
	"status" "exception_status" DEFAULT 'detected' NOT NULL,
	"owner_id" text,
	"resolution" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_field" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bid_id" uuid,
	"document_id" uuid,
	"field" text NOT NULL,
	"value" jsonb,
	"confidence" real NOT NULL,
	"source" jsonb,
	"model_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"counterparty" "counterparty" NOT NULL,
	"party_org_id" text NOT NULL,
	"number" text NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"partner_org_id" text NOT NULL,
	"service_type" text NOT NULL,
	"document_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leg" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid,
	"shipment_id" uuid,
	"seq" integer NOT NULL,
	"mode" "mode" NOT NULL,
	"from_locode" text NOT NULL,
	"to_locode" text NOT NULL,
	"carrier_org_id" text,
	"etd" timestamp with time zone,
	"eta" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"shipper_org_id" text NOT NULL,
	"bid_id" uuid,
	"carrier_org_id" text NOT NULL,
	"schedule_id" uuid,
	"equipment" text NOT NULL,
	"transit_days" integer,
	"carrier_cost" numeric(14, 2) NOT NULL,
	"sell_price" numeric(14, 2),
	"currency" text NOT NULL,
	"cost_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feasibility" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feasible" boolean DEFAULT false NOT NULL,
	"ranking" jsonb,
	"rank" integer,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "party_type" NOT NULL,
	"country" text,
	"verified" boolean DEFAULT false NOT NULL,
	"live" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"routed_via" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"shipper_org_id" text NOT NULL,
	"carrier_org_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"supersedes_quote_id" uuid,
	"status" "quote_status" DEFAULT 'issued' NOT NULL,
	"carrier_cost" numeric(14, 2) NOT NULL,
	"margin" numeric(14, 2) NOT NULL,
	"margin_pct" real NOT NULL,
	"sell_price" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approval_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"desk_org_id" text NOT NULL,
	"carrier_org_id" text NOT NULL,
	"kind" "rate_kind" NOT NULL,
	"origin_locode" text NOT NULL,
	"destination_locode" text NOT NULL,
	"equipment" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supersedes_rate_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"desk_org_id" text NOT NULL,
	"shipper_org_id" text NOT NULL,
	"status" "request_status" DEFAULT 'draft' NOT NULL,
	"source_channel" "channel" NOT NULL,
	"revises_request_id" uuid,
	"mode" "mode",
	"origin_locode" text,
	"destination_locode" text,
	"incoterm" text,
	"ready_date" date,
	"delivery_deadline" date,
	"deadline_hard" boolean DEFAULT false NOT NULL,
	"cargo_value" numeric(14, 2),
	"cargo_value_currency" text,
	"target_price" numeric(14, 2),
	"insurance_required" boolean DEFAULT false NOT NULL,
	"ranking_preset" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "request_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "review_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extracted_field_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"threshold" real NOT NULL,
	"assigned_to" text,
	"resolved_value" jsonb,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"revealed" jsonb NOT NULL,
	"reply_deadline" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ruleset_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"desk_org_id" text,
	"body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_org_id" text NOT NULL,
	"service" text NOT NULL,
	"vessel" text,
	"voyage" text,
	"origin_locode" text NOT NULL,
	"destination_locode" text NOT NULL,
	"etd" timestamp with time zone NOT NULL,
	"eta" timestamp with time zone NOT NULL,
	"cutoffs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"blank" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"desk_org_id" text NOT NULL,
	"shipper_org_id" text NOT NULL,
	"carrier_org_id" text NOT NULL,
	"status" "shipment_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_label" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extracted_field_id" uuid NOT NULL,
	"carrier_org_id" text,
	"format" "channel" NOT NULL,
	"field" text NOT NULL,
	"predicted" jsonb,
	"corrected" jsonb,
	"was_correct" boolean NOT NULL,
	"labelled_by" text NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"equipment" text NOT NULL,
	"container_no" text,
	"seal_no" text,
	"vgm_kg" real
);
--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_party_id_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid" ADD CONSTRAINT "bid_rfq_id_rfq_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfq"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid" ADD CONSTRAINT "bid_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid" ADD CONSTRAINT "bid_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_shipper_org_id_party_id_fk" FOREIGN KEY ("shipper_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_hold" ADD CONSTRAINT "capacity_hold_slot_id_capacity_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."capacity_slot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_hold" ADD CONSTRAINT "capacity_hold_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_hold" ADD CONSTRAINT "capacity_hold_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_slot" ADD CONSTRAINT "capacity_slot_schedule_id_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_slot" ADD CONSTRAINT "capacity_slot_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargo_item" ADD CONSTRAINT "cargo_item_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge" ADD CONSTRAINT "charge_charge_code_charge_code_code_fk" FOREIGN KEY ("charge_code") REFERENCES "public"."charge_code"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desk_relationship" ADD CONSTRAINT "desk_relationship_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desk_relationship" ADD CONSTRAINT "desk_relationship_party_id_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_shipper_org_id_party_id_fk" FOREIGN KEY ("shipper_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception" ADD CONSTRAINT "exception_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception" ADD CONSTRAINT "exception_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception" ADD CONSTRAINT "exception_shipper_org_id_party_id_fk" FOREIGN KEY ("shipper_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception" ADD CONSTRAINT "exception_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_field" ADD CONSTRAINT "extracted_field_bid_id_bid_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bid"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_field" ADD CONSTRAINT "extracted_field_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_party_org_id_party_id_fk" FOREIGN KEY ("party_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_partner_org_id_party_id_fk" FOREIGN KEY ("partner_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leg" ADD CONSTRAINT "leg_option_id_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leg" ADD CONSTRAINT "leg_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leg" ADD CONSTRAINT "leg_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_shipper_org_id_party_id_fk" FOREIGN KEY ("shipper_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_bid_id_bid_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bid"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option" ADD CONSTRAINT "option_schedule_id_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_option_id_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_shipper_org_id_party_id_fk" FOREIGN KEY ("shipper_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate" ADD CONSTRAINT "rate_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate" ADD CONSTRAINT "rate_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_shipper_org_id_party_id_fk" FOREIGN KEY ("shipper_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_extracted_field_id_extracted_field_id_fk" FOREIGN KEY ("extracted_field_id") REFERENCES "public"."extracted_field"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq" ADD CONSTRAINT "rfq_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq" ADD CONSTRAINT "rfq_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruleset_version" ADD CONSTRAINT "ruleset_version_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_desk_org_id_party_id_fk" FOREIGN KEY ("desk_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_shipper_org_id_party_id_fk" FOREIGN KEY ("shipper_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_label" ADD CONSTRAINT "training_label_extracted_field_id_extracted_field_id_fk" FOREIGN KEY ("extracted_field_id") REFERENCES "public"."extracted_field"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_label" ADD CONSTRAINT "training_label_carrier_org_id_party_id_fk" FOREIGN KEY ("carrier_org_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_desk_idx" ON "audit_log" USING btree ("desk_org_id","at");--> statement-breakpoint
CREATE INDEX "bid_rfq_idx" ON "bid" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "bid_carrier_idx" ON "bid" USING btree ("carrier_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "desk_relationship_pk" ON "desk_relationship" USING btree ("desk_org_id","party_id");--> statement-breakpoint
CREATE INDEX "request_desk_idx" ON "request" USING btree ("desk_org_id");--> statement-breakpoint
CREATE INDEX "request_shipper_idx" ON "request" USING btree ("shipper_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ruleset_version_uq" ON "ruleset_version" USING btree ("kind","desk_org_id","version");