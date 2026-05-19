import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { MoneyFormatSettings } from '@/types';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatMontantWithSettings } from '@/lib/utils';
import { SinglePageFormFooter } from '@/components/shared/SinglePageFormFooter';

const moneyFormatSchema = z
  .object({
    locale: z.string().min(1),
    currencyCode: z
      .string()
      .trim()
      .min(1, 'Le code devise est requis')
      .max(8, 'Le code devise est trop long')
      .transform((value) => value.toUpperCase()),
    thousandsSeparator: z.enum(['space', 'dot', 'comma', 'apostrophe', 'none']),
    decimalSeparator: z.enum(['comma', 'dot']),
    minimumFractionDigits: z.coerce.number().int().min(0).max(4),
    maximumFractionDigits: z.coerce.number().int().min(0).max(4),
  })
  .refine(
    (data) => data.maximumFractionDigits >= data.minimumFractionDigits,
    {
      message: 'Le nombre maximal de décimales doit être supérieur ou égal au minimum.',
      path: ['maximumFractionDigits'],
    },
  );

export type MoneyFormatFormValues = z.infer<typeof moneyFormatSchema>;

interface MoneyFormatFormProps {
  value: MoneyFormatSettings;
  onSubmit: (data: MoneyFormatFormValues) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const previewAmount = 123456789.45;

export function MoneyFormatForm({
  value,
  onSubmit,
  onCancel,
  onDirtyChange,
}: MoneyFormatFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MoneyFormatFormValues>({
    resolver: zodResolver(moneyFormatSchema),
    defaultValues: {
      locale: value.locale || 'fr-FR',
      currencyCode: value.currencyCode || 'XAF',
      thousandsSeparator: value.thousandsSeparator || 'space',
      decimalSeparator: value.decimalSeparator || 'comma',
      minimumFractionDigits: value.minimumFractionDigits ?? 0,
      maximumFractionDigits: value.maximumFractionDigits ?? 0,
    },
  });

  useEffect(() => {
    form.reset({
      locale: value.locale || 'fr-FR',
      currencyCode: value.currencyCode || 'XAF',
      thousandsSeparator: value.thousandsSeparator || 'space',
      decimalSeparator: value.decimalSeparator || 'comma',
      minimumFractionDigits: value.minimumFractionDigits ?? 0,
      maximumFractionDigits: value.maximumFractionDigits ?? 0,
    });
  }, [form, value]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const watched = form.watch();
  const safeMinimumFractionDigits = watched.minimumFractionDigits ?? 0;
  const safeMaximumFractionDigits = Math.max(
    watched.maximumFractionDigits ?? 0,
    safeMinimumFractionDigits,
  );

  const preview = formatMontantWithSettings(
    previewAmount,
    {
      locale: watched.locale,
      currencyCode: watched.currencyCode,
      thousandsSeparator: watched.thousandsSeparator,
      decimalSeparator: watched.decimalSeparator,
      minimumFractionDigits: safeMinimumFractionDigits,
      maximumFractionDigits: safeMaximumFractionDigits,
    },
    {
      minimumFractionDigits: safeMinimumFractionDigits,
      maximumFractionDigits: safeMaximumFractionDigits,
    },
  );

  const handleSubmit = async (data: MoneyFormatFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="locale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locale de base</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une locale" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fr-FR">Français (France)</SelectItem>
                    <SelectItem value="fr-CM">Français (Cameroun)</SelectItem>
                    <SelectItem value="fr-BJ">Français (Bénin)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Base culturelle utilisée pour le format des nombres.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currencyCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code devise</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="XAF"
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormDescription>
                  Utilisé pour l&apos;affichage des montants dans les dashboards.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="thousandsSeparator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Séparateur de milliers</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un séparateur" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="space">Espace</SelectItem>
                    <SelectItem value="dot">Point</SelectItem>
                    <SelectItem value="comma">Virgule</SelectItem>
                    <SelectItem value="apostrophe">Apostrophe</SelectItem>
                    <SelectItem value="none">Aucun</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="decimalSeparator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Séparateur décimal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un séparateur" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="comma">Virgule</SelectItem>
                    <SelectItem value="dot">Point</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minimumFractionDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Décimales minimales</FormLabel>
                <Select
                  onValueChange={(val) => {
                    const nextMin = Number(val);
                    field.onChange(nextMin);
                    const currentMax = form.getValues('maximumFractionDigits');
                    if (currentMax < nextMin) {
                      form.setValue('maximumFractionDigits', nextMin, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un minimum" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maximumFractionDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Décimales maximales</FormLabel>
                <Select
                  onValueChange={(val) => {
                    const nextMax = Number(val);
                    field.onChange(nextMax);
                    const currentMin = form.getValues('minimumFractionDigits');
                    if (nextMax < currentMin) {
                      form.setValue('minimumFractionDigits', nextMax, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un maximum" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Aperçu</p>
          <p className="mt-2 text-2xl font-semibold">{preview}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aperçu standard basé sur 123456789.45.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Affichage dashboard : {watched.currencyCode ? `${preview} ${watched.currencyCode}` : preview}
          </p>
        </div>

        <SinglePageFormFooter
          mode="edit"
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          className="gap-2 pt-4"
        />
      </form>
    </Form>
  );
}
