import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import {
  Settings,
  Check,
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  X,
  Calendar,
  Info,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface UserOption {
  id: string;
  displayName: string;
  uid: string;
}

interface LaboratoryLaboranEntry {
  userId: string;
  user: { id: string; displayName: string; email: string; waNumber: string | null };
}

interface LaboratoryItem {
  id: string;
  name: string;
  code: string | null;
  kepalaLabId: string | null;
  kepalaLab: { id: string; displayName: string; email: string; waNumber: string | null } | null;
  laborans: LaboratoryLaboranEntry[];
}

export default function PengaturanAplikasi() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  const [activeMenu, setActiveMenu] = useState<string>("");

  // --- Profil Laboratorium state ---
  const [laboratories, setLaboratories] = useState<LaboratoryItem[]>([]);
  const [labsLoading, setLabsLoading] = useState(true);
  const [labsError, setLabsError] = useState<string | null>(null);
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [selectedLab, setSelectedLab] = useState<LaboratoryItem | null>(null);

  const [dosenList, setDosenList] = useState<UserOption[]>([]);
  const [laboranList, setLaboranList] = useState<UserOption[]>([]);

  const [editKepalaId, setEditKepalaId] = useState<string | null>(null);
  const [editLaboranId, setEditLaboranId] = useState<string | null>(null);
  const [kepalaSearchQuery, setKepalaSearchQuery] = useState("");
  const [laboranSearchQuery, setLaboranSearchQuery] = useState("");
  const [showKepalaDropdown, setShowKepalaDropdown] = useState(false);
  const [showLaboranDropdown, setShowLaboranDropdown] = useState(false);
  const [savingLab, setSavingLab] = useState(false);
  const [showLabEditSuccess, setShowLabEditSuccess] = useState(false);
  const [labEditError, setLabEditError] = useState<string | null>(null);

  // --- Denda & Keterlambatan state ---
  const [penaltyAmount, setPenaltyAmount] = useState<number>(25000);
  const [toleranceDays, setToleranceDays] = useState<number>(0);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingPenalty, setSavingPenalty] = useState(false);
  const [showPenaltySuccess, setShowPenaltySuccess] = useState(false);
  const [penaltyError, setPenaltyError] = useState<string | null>(null);

  // --- Hari Libur (belum di-wire ke backend) ---
  const [holidays, setHolidays] = useState([
    { id: 1, date: "2026-01-01", description: "Tahun Baru Masehi" },
  ]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayDescription, setNewHolidayDescription] = useState("");

  // Fetch labs + dosen + laboran sekali saat mount.
  useEffect(() => {
    let cancelled = false;
    setLabsLoading(true);
    setLabsError(null);
    Promise.all([
      fetch(`${API_BASE}/api/laboratories`, { credentials: "include" }).then(
        async (r) => {
          if (!r.ok) throw new Error(`lab list HTTP ${r.status}`);
          return r.json() as Promise<{ items: LaboratoryItem[] }>;
        },
      ),
      fetch(`${API_BASE}/api/users?role=DOSEN&take=200`, {
        credentials: "include",
      }).then(async (r) => {
        if (!r.ok) throw new Error(`dosen HTTP ${r.status}`);
        return r.json() as Promise<{
          items: Array<{ id: string; displayName: string; uid: string }>;
        }>;
      }),
      fetch(`${API_BASE}/api/users?role=LABORAN&take=200`, {
        credentials: "include",
      }).then(async (r) => {
        if (!r.ok) throw new Error(`laboran HTTP ${r.status}`);
        return r.json() as Promise<{
          items: Array<{ id: string; displayName: string; uid: string }>;
        }>;
      }),
    ])
      .then(([labs, dosens, laborans]) => {
        if (cancelled) return;
        setLaboratories(labs.items);
        setDosenList(
          dosens.items.map((u) => ({
            id: u.id,
            displayName: u.displayName,
            uid: u.uid,
          })),
        );
        setLaboranList(
          laborans.items.map((u) => ({
            id: u.id,
            displayName: u.displayName,
            uid: u.uid,
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setLabsError(
            err instanceof Error ? err.message : "Gagal memuat data",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLabsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch app-settings saat user buka tab Denda & Keterlambatan.
  useEffect(() => {
    if (activeMenu !== "Denda & Keterlambatan") return;
    let cancelled = false;
    setSettingsLoading(true);
    setPenaltyError(null);
    fetch(`${API_BASE}/api/app-settings`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`settings HTTP ${r.status}`);
        return r.json() as Promise<{
          lateFeePerDayIdr: number;
          lateFeeToleranceDays: number;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setPenaltyAmount(data.lateFeePerDayIdr ?? 25000);
        setToleranceDays(data.lateFeeToleranceDays ?? 0);
      })
      .catch((err) => {
        if (!cancelled) {
          setPenaltyError(
            err instanceof Error ? err.message : "Gagal memuat pengaturan",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMenu]);

  const handleSelectLab = (lab: LaboratoryItem) => {
    setSelectedLab(lab);
    setEditKepalaId(lab.kepalaLabId);
    setEditLaboranId(lab.laborans[0]?.userId ?? null);
    setKepalaSearchQuery("");
    setLaboranSearchQuery("");
    setShowKepalaDropdown(false);
    setShowLaboranDropdown(false);
    setShowLabEditSuccess(false);
    setLabEditError(null);
  };

  const handleBackToList = () => {
    setSelectedLab(null);
    setShowLabEditSuccess(false);
    setLabEditError(null);
  };

  const handleSaveLabEdit = async () => {
    if (!selectedLab) return;
    setSavingLab(true);
    setLabEditError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/laboratories/${selectedLab.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kepalaLabId: editKepalaId,
            laboranIds: editLaboranId ? [editLaboranId] : [],
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ?? body?.error ?? `HTTP ${res.status}`,
        );
      }
      const updated = (await res.json()) as LaboratoryItem;
      setLaboratories((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)),
      );
      setSelectedLab(updated);
      setShowLabEditSuccess(true);
      setTimeout(() => setShowLabEditSuccess(false), 3000);
    } catch (err) {
      setLabEditError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSavingLab(false);
    }
  };

  const handleSavePenalty = async () => {
    setSavingPenalty(true);
    setPenaltyError(null);
    try {
      const res = await fetch(`${API_BASE}/api/app-settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lateFeePerDayIdr: penaltyAmount,
          lateFeeToleranceDays: toleranceDays,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ?? body?.error ?? `HTTP ${res.status}`,
        );
      }
      setShowPenaltySuccess(true);
      setTimeout(() => setShowPenaltySuccess(false), 3000);
    } catch (err) {
      setPenaltyError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSavingPenalty(false);
    }
  };

  const handleAddHoliday = () => {
    if (newHolidayDate && newHolidayDescription) {
      const newHoliday = {
        id: holidays.length + 1,
        date: newHolidayDate,
        description: newHolidayDescription,
      };
      setHolidays([...holidays, newHoliday]);
      setNewHolidayDate("");
      setNewHolidayDescription("");
    }
  };

  const handleDeleteHoliday = (holidayId: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus hari libur ini?")) {
      setHolidays(holidays.filter((h) => h.id !== holidayId));
    }
  };

  const filteredLabs = useMemo(() => {
    if (!labSearchQuery) return laboratories;
    const q = labSearchQuery.toLowerCase();
    return laboratories.filter((lab) => lab.name.toLowerCase().includes(q));
  }, [laboratories, labSearchQuery]);

  const filteredDosen = useMemo(() => {
    const q = kepalaSearchQuery.toLowerCase();
    return dosenList.filter(
      (d) =>
        d.displayName.toLowerCase().includes(q) ||
        d.uid.toLowerCase().includes(q),
    );
  }, [dosenList, kepalaSearchQuery]);

  const filteredLaboran = useMemo(() => {
    const q = laboranSearchQuery.toLowerCase();
    return laboranList.filter(
      (l) =>
        l.displayName.toLowerCase().includes(q) ||
        l.uid.toLowerCase().includes(q),
    );
  }, [laboranList, laboranSearchQuery]);

  const selectedKepalaName =
    dosenList.find((d) => d.id === editKepalaId)?.displayName ?? null;
  const selectedKepalaUid =
    dosenList.find((d) => d.id === editKepalaId)?.uid ?? "";
  const selectedLaboranName =
    laboranList.find((l) => l.id === editLaboranId)?.displayName ?? null;
  const selectedLaboranUid =
    laboranList.find((l) => l.id === editLaboranId)?.uid ?? "";

  const renderContent = () => {
    switch (activeMenu) {
      case "Profil Laboratorium":
        if (labsLoading) {
          return (
            <div className="flex items-center gap-2 text-gray-600 py-12">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat daftar laboratorium…</span>
            </div>
          );
        }
        if (labsError) {
          return (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Gagal memuat data: {labsError}
              </AlertDescription>
            </Alert>
          );
        }

        if (selectedLab) {
          return (
            <div>
              <Button variant="outline" onClick={handleBackToList} className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Daftar
              </Button>

              <Card className="p-6 shadow-sm mb-6">
                <div className="space-y-4">
                  <div>
                    <Label>Nama Laboratorium</Label>
                    <Input value={selectedLab.name} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500 mt-1">
                      Nama laboratorium tidak bisa diubah (3 lab resmi).
                    </p>
                  </div>

                  {/* Kepala Lab dropdown */}
                  <div>
                    <Label htmlFor="edit-kepala-lab">Nama Kepala Laboratorium</Label>
                    <div className="relative">
                      {selectedKepalaName ? (
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedKepalaName}</p>
                            <p className="text-xs text-gray-500">{selectedKepalaUid}</p>
                          </div>
                          {isSuperAdmin && (
                            <button
                              onClick={() => setEditKepalaId(null)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            id="edit-kepala-lab"
                            value={kepalaSearchQuery}
                            onChange={(e) => setKepalaSearchQuery(e.target.value)}
                            placeholder="Cari nama dosen…"
                            onFocus={() => setShowKepalaDropdown(true)}
                            onBlur={() =>
                              setTimeout(() => setShowKepalaDropdown(false), 200)
                            }
                            disabled={!isSuperAdmin}
                            className="pl-10"
                          />
                          {showKepalaDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                              {filteredDosen.length > 0 ? (
                                filteredDosen.map((d) => (
                                  <div
                                    key={d.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setEditKepalaId(d.id);
                                      setKepalaSearchQuery("");
                                      setShowKepalaDropdown(false);
                                    }}
                                  >
                                    <p className="text-sm font-medium">{d.displayName}</p>
                                    <p className="text-xs text-gray-500">{d.uid}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Tidak ada dosen ditemukan
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Daftar diambil dari akun dengan peran Dosen. Satu dosen boleh jadi
                      kepala di &gt;1 lab.
                    </p>
                  </div>

                  {/* Laboran dropdown */}
                  <div>
                    <Label htmlFor="edit-laboran">Nama Laboran</Label>
                    <div className="relative">
                      {selectedLaboranName ? (
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedLaboranName}</p>
                            <p className="text-xs text-gray-500">{selectedLaboranUid}</p>
                          </div>
                          {isSuperAdmin && (
                            <button
                              onClick={() => setEditLaboranId(null)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            id="edit-laboran"
                            value={laboranSearchQuery}
                            onChange={(e) => setLaboranSearchQuery(e.target.value)}
                            placeholder="Cari nama laboran…"
                            onFocus={() => setShowLaboranDropdown(true)}
                            onBlur={() =>
                              setTimeout(() => setShowLaboranDropdown(false), 200)
                            }
                            disabled={!isSuperAdmin}
                            className="pl-10"
                          />
                          {showLaboranDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                              {filteredLaboran.length > 0 ? (
                                filteredLaboran.map((l) => (
                                  <div
                                    key={l.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setEditLaboranId(l.id);
                                      setLaboranSearchQuery("");
                                      setShowLaboranDropdown(false);
                                    }}
                                  >
                                    <p className="text-sm font-medium">{l.displayName}</p>
                                    <p className="text-xs text-gray-500">{l.uid}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Tidak ada laboran ditemukan
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Satu lab hanya memiliki 1 laboran.
                    </p>
                  </div>
                </div>
              </Card>

              <Button
                onClick={handleSaveLabEdit}
                className="w-full"
                disabled={!isSuperAdmin || savingLab}
              >
                {savingLab ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>

              {!isSuperAdmin && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  Hanya Super Admin yang bisa mengubah assignment kepala lab & laboran.
                </p>
              )}

              {labEditError && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {labEditError}
                  </AlertDescription>
                </Alert>
              )}
              {showLabEditSuccess && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Profil laboratorium berhasil diperbarui.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        }

        return (
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Kelola profil 3 laboratorium resmi Statistika FMIPA UII. Klik baris untuk
              mengedit assignment kepala lab &amp; laboran.
            </p>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama laboratorium…"
                  value={labSearchQuery}
                  onChange={(e) => setLabSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Laboratorium</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kode</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kepala Laboratorium</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Laboran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLabs.map((lab, index) => (
                      <tr
                        key={lab.id}
                        className="bg-white hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectLab(lab)}
                      >
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{lab.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lab.code ?? "-"}</td>
                        <td className="px-4 py-3 text-sm">
                          {lab.kepalaLab?.displayName ?? (
                            <span className="text-gray-400 italic">Belum di-assign</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {lab.laborans[0]?.user.displayName ?? (
                            <span className="text-gray-400 italic">Belum di-assign</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredLabs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada laboratorium yang ditemukan
                </div>
              )}
            </Card>
          </div>
        );

      case "Denda & Keterlambatan":
        return (
          <div className="max-w-2xl">
            {settingsLoading ? (
              <div className="flex items-center gap-2 text-gray-600 py-8">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memuat pengaturan…</span>
              </div>
            ) : (
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <Label
                      htmlFor="penalty-amount"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Besaran Denda per Hari
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                        Rp
                      </span>
                      <Input
                        id="penalty-amount"
                        type="number"
                        min={0}
                        value={penaltyAmount}
                        onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                        placeholder="0"
                        className="pl-10"
                        disabled={!isSuperAdmin}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Denda akan dihitung per hari keterlambatan pengembalian aset.
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="tolerance-days"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Toleransi Keterlambatan
                    </Label>
                    <div className="relative">
                      <Input
                        id="tolerance-days"
                        type="number"
                        min={0}
                        value={toleranceDays}
                        onChange={(e) => setToleranceDays(Number(e.target.value))}
                        placeholder="0"
                        className="pr-12"
                        disabled={!isSuperAdmin}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                        hari
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Jumlah hari setelah jatuh tempo sebelum denda mulai dihitung.
                      Isi <b>0</b> berarti denda langsung berjalan keesokan harinya.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Contoh Perhitungan
                    </p>
                    <p className="text-sm text-gray-600">
                      Keterlambatan 5 hari × Rp {penaltyAmount.toLocaleString("id-ID")} = Rp{" "}
                      {(5 * penaltyAmount).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <Button
                    onClick={handleSavePenalty}
                    className="bg-blue-900 hover:bg-blue-800"
                    disabled={!isSuperAdmin || savingPenalty}
                  >
                    {savingPenalty ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan…
                      </>
                    ) : (
                      "Simpan Pengaturan"
                    )}
                  </Button>

                  {!isSuperAdmin && (
                    <p className="text-xs text-gray-500 italic">
                      Hanya Super Admin yang bisa mengubah pengaturan denda.
                    </p>
                  )}
                </div>
              </Card>
            )}

            {penaltyError && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {penaltyError}
                </AlertDescription>
              </Alert>
            )}
            {showPenaltySuccess && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Pengaturan denda berhasil disimpan.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case "Hari Libur": {
        const formatDateDisplay = (dateStr: string) => {
          const date = new Date(dateStr);
          const dayName = date.toLocaleDateString("id-ID", { weekday: "long" });
          const day = date.getDate();
          const month = date.toLocaleDateString("id-ID", { month: "long" });
          const year = date.getFullYear();
          return `${dayName}, ${day} ${month} ${year}`;
        };
        return (
          <div>
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Modul ini masih tahap preview (belum tersambung ke backend).
              </AlertDescription>
            </Alert>

            <div className="mb-6 flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  placeholder="Pilih tanggal hari libur"
                  className="pl-10 w-full sm:w-[220px]"
                />
              </div>
              <Input
                type="text"
                value={newHolidayDescription}
                onChange={(e) => setNewHolidayDescription(e.target.value)}
                placeholder="Keterangan (contoh: Hari Raya Idul Fitri)"
                className="flex-1"
              />
              <Button
                onClick={handleAddHoliday}
                disabled={!newHolidayDate}
                className="bg-blue-900 hover:bg-blue-800 flex-shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah
              </Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Keterangan</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {holidays.map((h, i) => (
                      <tr key={h.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatDateDisplay(h.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {h.description || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {holidays.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Belum ada hari libur terdaftar
                </div>
              )}
            </Card>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Pengaturan"
      breadcrumbs={[
        { label: "Pengaturan" },
        ...(activeMenu ? [{ label: activeMenu }] : []),
      ]}
      icon={<Settings className="w-8 h-8 text-white" />}
      sidebarItems={["Profil Laboratorium", "Denda & Keterlambatan", "Hari Libur"]}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? (
        renderContent()
      ) : (
        <div className="max-w-md">
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-gray-600 to-slate-500 rounded-xl flex items-center justify-center mb-3">
            <Settings className="w-11 h-11 text-white" />
          </div>
          <h2 className="font-bold text-gray-900 text-xl mb-1">Pengaturan Aplikasi</h2>
          <p className="text-sm text-gray-500 mb-5">Konfigurasi dan Pengaturan Sistem</p>
          <button
            onClick={() => setActiveMenu("Profil Laboratorium")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Pengaturan Aplikasi
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}
