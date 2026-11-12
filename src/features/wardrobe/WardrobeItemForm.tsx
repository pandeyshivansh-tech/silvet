import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import { errorMessage, isRepositoryError, useIsDemo, useItemImages } from "@/data";
import { prepareImage, validateImage } from "@/lib/images";
import { CATEGORIES, COLORS, OCCASIONS, PATTERNS, SEASONS, STYLES, subcategoriesOf } from "@/domain/taxonomy";
import { fieldErrors, ITEM_NAME_MAX, itemInputSchema, type ItemInput } from "@/domain/schemas";
import { Button, Chip, SelectField, TextField } from "@/ui";
import { GarmentFrame } from "@/ui";
import type { ClothingItem, PreparedImage } from "@/domain/types";

interface FormValues {
  name: string;
  categorySlug: string;
  subcategorySlug: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: string;
  styleTags: string[];
  occasionTags: string[];
  seasonTags: string[];
}

const blank: FormValues = {
  name: "",
  categorySlug: "",
  subcategorySlug: "",
  primaryColor: "",
  secondaryColor: "",
  pattern: "",
  styleTags: [],
  occasionTags: [],
  seasonTags: [],
};

function valuesFromItem(item?: ClothingItem): FormValues {
  if (!item) return blank;
  return {
    name: item.name,
    categorySlug: item.categorySlug,
    subcategorySlug: item.subcategorySlug ?? "",
    primaryColor: item.primaryColor ?? "",
    secondaryColor: item.secondaryColor ?? "",
    pattern: item.pattern ?? "",
    styleTags: [...item.styleTags],
    occasionTags: [...item.occasionTags],
    seasonTags: [...item.seasonTags],
  };
}

type InitialInput = Partial<Omit<ItemInput, "categorySlug">> & { categorySlug?: string };
function valuesFromInput(input?: InitialInput): FormValues {
  if (!input) return blank;
  return { ...blank, ...input, subcategorySlug: input.subcategorySlug ?? "", primaryColor: input.primaryColor ?? "",
    secondaryColor: input.secondaryColor ?? "", pattern: input.pattern ?? "" };
}

function TagChoices({ title, options, selected, error, onToggle, field }: {
  title: string;
  options: readonly { slug: string; label: string }[];
  selected: string[];
  error?: string;
  onToggle: (slug: string) => void;
  field: string;
}) {
  return (
    <fieldset className="min-w-0" aria-describedby={error ? `${field}-error` : undefined} data-field={field} tabIndex={-1}>
      <legend className="text-ui font-medium text-midnight">{title}<span className="ml-2 text-caption font-normal text-graphite-deep">optional</span></legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option.slug} selected={selected.includes(option.slug)} onClick={() => onToggle(option.slug)}>{option.label}</Chip>
        ))}
      </div>
      {error && <p className="mt-2 text-caption text-danger" id={`${field}-error`} role="alert">{error}</p>}
    </fieldset>
  );
}

export function WardrobeItemForm({ initialItem, initialInput, initialPhoto, submitLabel, loading = false, onSave }: {
  initialItem?: ClothingItem;
  initialInput?: InitialInput;
  initialPhoto?: File;
  submitLabel: string;
  loading?: boolean;
  onSave: (input: ItemInput, image?: PreparedImage | null) => Promise<void>;
}) {
  const isDemo = useIsDemo();
  const formRef = useRef<HTMLFormElement>(null);
  const submitLock = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<FormValues>(() => initialItem ? valuesFromItem(initialItem) : valuesFromInput(initialInput));
  const [fieldErrorMap, setFieldErrorMap] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [photo, setPhoto] = useState<File | null>(initialPhoto ?? null);
  const [photoError, setPhotoError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const existingImages = useItemImages(initialItem ? [initialItem] : undefined);
  const existingUrl = initialItem ? existingImages.byItem.get(initialItem.id)?.full : undefined;

  useEffect(() => {
    if (!photo) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const setValue = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFormError("");
    setFieldErrorMap((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const toggle = (field: "styleTags" | "occasionTags" | "seasonTags", slug: string) => {
    const current = values[field];
    setValue(field, current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || submitLock.current) return;
    setFormError("");
    const result = itemInputSchema.safeParse({
      ...values,
      subcategorySlug: values.subcategorySlug || null,
      primaryColor: values.primaryColor || null,
      secondaryColor: values.secondaryColor || null,
      pattern: values.pattern || null,
    });
    if (!result.success) {
      const errors = fieldErrors(result.error);
      setFieldErrorMap(errors);
      setFormError(errors._form ?? "");
      const firstField = Object.keys(errors).find((field) => field !== "_form");
      const target = firstField
        ? formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"], [data-field="${firstField}"] button`)
        : null;
      target?.focus();
      return;
    }
    setFieldErrorMap({});
    submitLock.current = true;
    try {
      await onSave(result.data, isDemo ? undefined : photo ? prepareImage(photo) : removeImage ? null : undefined);
    } catch (error) {
      if (isRepositoryError(error) && error.fieldErrors) {
        setFieldErrorMap(error.fieldErrors);
        setFormError(error.fieldErrors._form ?? "");
        const firstField = Object.keys(error.fieldErrors).find((field) => field !== "_form");
        if (firstField) formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"], [data-field="${firstField}"] button`)?.focus();
      } else {
        setFormError(errorMessage(error));
      }
    } finally {
      submitLock.current = false;
    }
  };

  const previewItem = {
    name: values.name || "Your piece",
    categorySlug: values.categorySlug || "tops",
    subcategorySlug: values.subcategorySlug || null,
    primaryColor: values.primaryColor || null,
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.72fr)] lg:gap-16">
      <div className="space-y-8">
        <TextField
          label="Name"
          requiredMark
          name="name"
          autoComplete="off"
          maxLength={ITEM_NAME_MAX}
          value={values.name}
          onChange={(event) => setValue("name", event.target.value)}
          placeholder="For example, indigo everyday kurta"
          error={fieldErrorMap.name}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Category"
            requiredMark
            name="categorySlug"
            value={values.categorySlug}
            onChange={(event) => {
              setValue("categorySlug", event.target.value);
              setValue("subcategorySlug", "");
            }}
            options={CATEGORIES.map(({ slug, label }) => ({ value: slug, label }))}
            placeholder="Choose a category"
            error={fieldErrorMap.categorySlug}
          />
          <SelectField
            label="Type"
            name="subcategorySlug"
            value={values.subcategorySlug}
            onChange={(event) => setValue("subcategorySlug", event.target.value)}
            options={values.categorySlug ? subcategoriesOf(values.categorySlug).map(({ slug, label }) => ({ value: slug, label })) : []}
            placeholder={values.categorySlug ? "Choose a type" : "Choose a category first"}
            disabled={!values.categorySlug}
            optional
            error={fieldErrorMap.subcategorySlug}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Main colour"
            name="primaryColor"
            value={values.primaryColor}
            onChange={(event) => setValue("primaryColor", event.target.value)}
            options={COLORS.map(({ slug, label }) => ({ value: slug, label }))}
            placeholder="Choose a colour"
            optional
            error={fieldErrorMap.primaryColor}
          />
          <SelectField
            label="Second colour"
            name="secondaryColor"
            value={values.secondaryColor}
            onChange={(event) => setValue("secondaryColor", event.target.value)}
            options={COLORS.map(({ slug, label }) => ({ value: slug, label }))}
            placeholder="Choose a colour"
            optional
            error={fieldErrorMap.secondaryColor}
          />
        </div>
        <SelectField
          label="Pattern"
          name="pattern"
          value={values.pattern}
          onChange={(event) => setValue("pattern", event.target.value)}
          options={PATTERNS.map(({ slug, label }) => ({ value: slug, label }))}
          placeholder="Choose a pattern"
          optional
          error={fieldErrorMap.pattern}
        />
        <div className="space-y-7 border-t border-line pt-6">
          <TagChoices title="Style" field="styleTags" options={STYLES} selected={values.styleTags} error={fieldErrorMap.styleTags} onToggle={(slug) => toggle("styleTags", slug)} />
          <TagChoices title="Occasion" field="occasionTags" options={OCCASIONS} selected={values.occasionTags} error={fieldErrorMap.occasionTags} onToggle={(slug) => toggle("occasionTags", slug)} />
          <TagChoices title="Season" field="seasonTags" options={SEASONS} selected={values.seasonTags} error={fieldErrorMap.seasonTags} onToggle={(slug) => toggle("seasonTags", slug)} />
        </div>
        {formError && <p className="border-l-2 border-danger pl-3 text-body text-danger" role="alert">{formError}</p>}
        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <Button type="submit" loading={loading} loadingLabel="Saving…" className="sm:min-w-52">{submitLabel}</Button>
          <p className="text-caption text-graphite-deep">Name and category are the only required details.</p>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-look text-midnight">Photo preview</h2>
          {(photo || (!isDemo && initialItem?.image && !removeImage)) && <button type="button" disabled={loading} className="text-caption text-graphite-deep underline underline-offset-4" onClick={() => {
            if (!photo) setRemoveImage(true);
            setPhoto(null);
            setPhotoError("");
            if (photoInputRef.current) photoInputRef.current.value = "";
          }}>{photo ? "Remove preview" : "Remove photo"}</button>}
        </div>
        <div className="mx-auto w-full max-w-72 lg:mx-0">
          <GarmentFrame key={previewUrl || existingUrl || "illustration"} item={previewItem} imageUrl={previewUrl || (!removeImage ? existingUrl : undefined)} placeholderTag={isDemo ? "Preview only" : "No photo"} />
        </div>
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xs border border-line-strong px-4 text-ui font-medium text-midnight transition-colors hover:bg-chalk-deep focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-midnight">
          <ImagePlus aria-hidden="true" className="size-4" />
          {photo ? "Choose a different photo" : "Choose a photo"}
          <input
            ref={photoInputRef}
            className="sr-only"
            type="file"
            accept={isDemo ? "image/*" : "image/jpeg,image/png,image/webp"}
            disabled={loading}
            aria-label="Choose a clothing photo for preview"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (!file.type.startsWith("image/")) {
                setPhotoError("Choose an image file to preview.");
                event.target.value = "";
                return;
              }
              if (!isDemo) {
                try { validateImage(file); }
                catch (error) {
                  setPhotoError(errorMessage(error));
                  event.target.value = "";
                  return;
                }
              }
              setPhotoError("");
              setPhoto(file);
            }}
          />
        </label>
        {!isDemo && <label className="block text-caption text-graphite-deep underline underline-offset-4">
          Take a photo
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={loading}
            aria-label="Take a clothing photo" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try { validateImage(file); setPhoto(file); setPhotoError(""); }
              catch (error) { setPhotoError(errorMessage(error)); }
              event.target.value = "";
            }} />
        </label>}
        {!isDemo && removeImage && !photo && <button type="button" disabled={loading} className="text-caption underline" onClick={() => setRemoveImage(false)}>Keep existing photo</button>}
        {photoError && <p className="text-caption text-danger" role="alert">{photoError}</p>}
        <p className="text-caption text-graphite-deep">
          {isDemo ? "Preview only — photos are not saved in this demo. Your clothing details can still be saved."
            : loading ? "Saving details and photo… Please wait." : "JPEG, PNG or WebP, up to 10 MiB. Photos are private and saved with your piece."}
        </p>
      </aside>
    </form>
  );
}
