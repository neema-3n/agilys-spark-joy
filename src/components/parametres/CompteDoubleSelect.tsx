import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Compte } from '@/types/compte.types';

interface CompteDoubleSelectProps {
  comptes: Compte[];
  debitValue: string;
  creditValue: string;
  onChangeDebit: (value: string) => void;
  onChangeCredit: (value: string) => void;
}

const COMPTE_TYPE_LABELS: Record<string, string> = {
  actif: 'Actif',
  passif: 'Passif',
  charge: 'Charges',
  produit: 'Produits',
  resultat: 'Résultat',
};

const RECENT_LIMIT = 6;

const formatCompteLabel = (compte: Compte) => `${compte.numero} · ${compte.libelle}`;

export const CompteDoubleSelect = ({
  comptes,
  debitValue,
  creditValue,
  onChangeDebit,
  onChangeCredit,
}: CompteDoubleSelectProps) => {
  const [open, setOpen] = useState(false);
  const [recentDebitIds, setRecentDebitIds] = useState<string[]>([]);
  const [recentCreditIds, setRecentCreditIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'debit' | 'credit'>('debit');

  useEffect(() => {
    try {
      const storedDebit = localStorage.getItem('agilys-regles-comptables-recent-debit');
      const storedCredit = localStorage.getItem('agilys-regles-comptables-recent-credit');
      if (storedDebit) setRecentDebitIds(JSON.parse(storedDebit));
      if (storedCredit) setRecentCreditIds(JSON.parse(storedCredit));
    } catch (error) {
      console.error('Impossible de charger les comptes récents', error);
    }
  }, []);

  const comptesById = useMemo(() => {
    return comptes.reduce<Record<string, Compte>>((acc, compte) => {
      acc[compte.id] = compte;
      return acc;
    }, {});
  }, [comptes]);

  const groupedComptes = useMemo(() => {
    return Object.entries(COMPTE_TYPE_LABELS).map(([type, label]) => ({
      type,
      label,
      comptes: comptes.filter((compte) => compte.type === type),
    }));
  }, [comptes]);

  const recentDebitComptes = recentDebitIds
    .map((id) => comptesById[id])
    .filter(Boolean) as Compte[];
  const recentCreditComptes = recentCreditIds
    .map((id) => comptesById[id])
    .filter(Boolean) as Compte[];

  const handleSelect = (side: 'debit' | 'credit', compteId: string) => {
    if (side === 'debit') {
      onChangeDebit(compteId);
      const nextRecent = [compteId, ...recentDebitIds.filter((id) => id !== compteId)].slice(0, RECENT_LIMIT);
      setRecentDebitIds(nextRecent);
      localStorage.setItem('agilys-regles-comptables-recent-debit', JSON.stringify(nextRecent));
      setActiveTab('credit'); // enchaîner sur la colonne crédit après le choix débit
    } else {
      onChangeCredit(compteId);
      const nextRecent = [compteId, ...recentCreditIds.filter((id) => id !== compteId)].slice(0, RECENT_LIMIT);
      setRecentCreditIds(nextRecent);
      localStorage.setItem('agilys-regles-comptables-recent-credit', JSON.stringify(nextRecent));
    }
  };

  const renderColumn = (side: 'debit' | 'credit') => {
    const currentValue = side === 'debit' ? debitValue : creditValue;
    const recentList = side === 'debit' ? recentDebitComptes : recentCreditComptes;

    return (
      <div className="flex h-full flex-col gap-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {side === 'debit' ? 'Débit' : 'Crédit'}
        </Label>
        <Command className="h-full">
          <CommandInput placeholder="Numéro ou libellé..." />
          <CommandList className="max-h-[50vh] overflow-y-auto sm:max-h-[60vh]">
            <CommandEmpty>Aucun compte trouvé</CommandEmpty>
            {recentList.length > 0 && (
              <>
                <CommandGroup heading="Récents">
                  {recentList.map((compte) => (
                  <CommandItem
                    key={compte.id}
                    value={`${compte.numero} ${compte.libelle}`}
                    onSelect={() => handleSelect(side, compte.id)}
                    className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                  >
                      <div className="flex w-full items-center justify-between">
                        <span className="truncate">{formatCompteLabel(compte)}</span>
                        {currentValue === compte.id && <Check className="h-4 w-4" />}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {groupedComptes.map((group) =>
              group.comptes.length ? (
                <CommandGroup key={`${side}-${group.type}`} heading={`${group.label} (${group.comptes.length})`}>
                  {group.comptes.map((compte) => (
                    <CommandItem
                      key={compte.id}
                      value={`${compte.numero} ${compte.libelle}`}
                      onSelect={() => handleSelect(side, compte.id)}
                      className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="truncate">{formatCompteLabel(compte)}</span>
                        {currentValue === compte.id && <Check className="h-4 w-4" />}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null
            )}
          </CommandList>
        </Command>
      </div>
    );
  };

  const debitLabel = debitValue && comptesById[debitValue] ? formatCompteLabel(comptesById[debitValue]) : 'Débit';
  const creditLabel =
    creditValue && comptesById[creditValue] ? formatCompteLabel(comptesById[creditValue]) : 'Crédit';

  return (
    <div className="space-y-2">
      <Label>Comptes à débiter / créditer *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between border-border bg-transparent text-foreground hover:bg-muted data-[state=open]:bg-muted"
          >
            <div className="flex flex-1 flex-col items-start gap-1 truncate text-left sm:flex-row sm:flex-nowrap sm:items-center sm:gap-3">
              <div className="flex w-full items-center gap-2 truncate leading-tight sm:w-auto sm:leading-normal">
                <span className="font-medium text-foreground">Débit :</span>
                <span className="truncate text-muted-foreground">{debitLabel}</span>
              </div>
              <span className="hidden sm:inline text-muted-foreground">|</span>
              <div className="flex w-full items-center gap-2 truncate leading-tight sm:w-auto sm:leading-normal">
                <span className="font-medium text-foreground">Crédit :</span>
                <span className="truncate text-muted-foreground">{creditLabel}</span>
              </div>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-w-[900px] w-[92vw] min-w-[320px] max-h-[85vh] overflow-hidden p-0 sm:w-[720px] md:w-[820px]">
          <div className="space-y-3 p-3 sm:p-4">
            {/* Mobile: onglets persistants */}
            <div className="sm:hidden">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'debit' | 'credit')} className="w-full">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="debit">Débit</TabsTrigger>
                  <TabsTrigger value="credit">Crédit</TabsTrigger>
                </TabsList>
                <TabsContent value="debit" className="mt-3">
                  {renderColumn('debit')}
                </TabsContent>
                <TabsContent value="credit" className="mt-3">
                  {renderColumn('credit')}
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop/tablette: deux colonnes côte à côte */}
            <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2 sm:gap-5">
              {renderColumn('debit')}
              {renderColumn('credit')}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
