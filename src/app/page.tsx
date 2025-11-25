"use client";

import { useState, useEffect, useMemo } from "react";
import { defineChain, getContract, prepareContractCall } from "thirdweb";
import { TransactionButton, useReadContract, ConnectButton, MediaRenderer } from "thirdweb/react";
import { upload } from "thirdweb/storage"; 
import { client } from "./client"; 
import imageCompression from 'browser-image-compression';
import * as XLSX from 'xlsx';

// --- TEMA WARNA ---
const theme = {
  primary: "#06b6d4", // Cyan 500
  primaryDark: "#0891b2", // Cyan 600
  secondary: "#334155", // Slate 700
  success: "#10b981", // Emerald 500
  danger: "#ef4444", // Red 500
  bgPage: "#f1f5f9", 
  bgCard: "#ffffff", 
  bgInput: "#f8fafc", 
  textDark: "#1e293b", 
  textMedium: "#64748b", 
  textLight: "#94a3b8", 
  border: "#e2e8f0", 
  shadowCard: "0 10px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.01)", 
  shadowModal: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
};

// --- STYLE OBJECT (SUDAH DIPERBAIKI) ---
const styles = {
  pageContainer: { padding: "60px 20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', sans-serif" },
  card: { backgroundColor: theme.bgCard, padding: "40px", borderRadius: "20px", boxShadow: theme.shadowCard, border: `1px solid ${theme.border}` },
  headingLabel: { display: "block", fontWeight: "600", color: theme.textDark, fontSize: "14px", marginBottom: "8px", letterSpacing: "0.3px" },
  input: { width: "100%", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${theme.border}`, color: theme.textDark, backgroundColor: theme.bgInput, fontSize: "15px", outline: "none", transition: "all 0.2s" },
  buttonPrimary: { width: "100%", backgroundColor: theme.primary, color: "white", fontWeight: "600", fontSize: "16px", padding: "16px", borderRadius: "12px", border: "none", cursor: "pointer", transition: "background 0.2s", boxShadow: "0 4px 6px -1px rgb(6 182 212 / 0.2)" },
  // ✅ Fix: Menambahkan helperText yang tadi hilang
  helperText: { fontSize: "13px", color: theme.textMedium, marginTop: "6px" },
  badge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", display: "inline-block" },
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const chain = defineChain(80002); 
  
  const contract = getContract({
    client: client,
    chain: chain,
    address: "0xA946f79D6ac71d29c008Aa0F40f07D693158F652", 
  });

  const MAX_NOTES_LENGTH = 50;

  // --- STATE ---
  const [weight, setWeight] = useState("");
  const [type, setType] = useState("Organic");
  const [method, setMethod] = useState("Maggot Farm");
  const [notes, setNotes] = useState(""); 
  const [location, setLocation] = useState(""); 
  const [file, setFile] = useState<File | null>(null); 
  const [isCompressing, setIsCompressing] = useState(false); 
  const [isLocating, setIsLocating] = useState(false); 
  const [showModal, setShowModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'timestamp', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- HELPER FUNCTIONS ---
  const shortenAddress = (address: string) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "";

  const formatDate = (timestamp: bigint) => {
    const dateObj = new Date(Number(timestamp) * 1000);
    return { 
        dateStr: dateObj.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        timeStr: dateObj.toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        fullDate: dateObj.toLocaleString("id-ID") 
    };
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert("Browser tidak mendukung GPS"); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`); setIsLocating(false); },
      (err) => { alert("Gagal ambil lokasi."); setIsLocating(false); }
    );
  };

  const handleImageUpload = async (event: any) => {
    const imageFile = event.target.files[0];
    if (!imageFile) return;
    setIsCompressing(true);
    try {
      const compressedBlob = await imageCompression(imageFile, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true });
      setFile(new File([compressedBlob], imageFile.name, { type: imageFile.type, lastModified: Date.now() })); 
    } catch (error) { console.error(error); alert("Gagal proses gambar"); } 
    finally { setIsCompressing(false); }
  };

  const handleReview = () => {
    if (!weight || Number(weight) <= 0) { alert("Isi berat sampah dengan benar!"); return; }
    if (!file) { alert("Wajib upload foto bukti!"); return; }
    if (!location) { alert("Ambil lokasi Dapur!"); return; }
    setShowModal(true);
  };

  const { data: wasteLogs, isLoading: loadingLogs } = useReadContract({
    contract,
    method: "function getAllLogs() view returns ((address kitchenId, uint256 weightInKg, string wasteType, string disposalMethod, string imageUrl, string notes, string coordinates, uint256 timestamp)[])",
    params: [],
  });

  // --- LOGIKA SORT & SEARCH ---
  const processedLogs = useMemo(() => {
    if (!wasteLogs) return [];
    let result = wasteLogs.filter((log) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.kitchenId.toLowerCase().includes(searchLower) ||
        log.wasteType.toLowerCase().includes(searchLower) ||
        log.disposalMethod.toLowerCase().includes(searchLower) ||
        log.notes.toLowerCase().includes(searchLower)
      );
    });
    result = [...result].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof typeof a];
      let bValue: any = b[sortConfig.key as keyof typeof b];
      if (typeof aValue === 'bigint') aValue = Number(aValue);
      if (typeof bValue === 'bigint') bValue = Number(bValue);
      if (typeof aValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [wasteLogs, searchTerm, sortConfig]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedLogs.length / itemsPerPage);

  const changePage = (pageNumber: number) => {
    if(pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
  };

  // Export Logic
  const handleExportExcel = () => {
    const dataToExport = processedLogs.map(log => ({
        "ID Dapur": log.kitchenId,
        "Waktu Lapor": formatDate(log.timestamp).fullDate,
        "Berat (Gram)": Number(log.weightInKg),
        "Jenis Sampah": log.wasteType,
        "Pengelolaan": log.disposalMethod,
        "Catatan": log.notes,
        "Koordinat": log.coordinates,
        "Link Foto": log.imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/"),
        "Status": "Terverifikasi On-Chain"
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Sampah MBG");
    XLSX.writeFile(workbook, `Laporan_MBG_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <span style={{fontSize:'10px', marginLeft:'4px', color: theme.textLight}}>↕️</span>;
    return sortConfig.direction === 'asc' ? <span style={{fontSize:'10px', marginLeft:'4px', color: theme.primary}}>⬆️</span> : <span style={{fontSize:'10px', marginLeft:'4px', color: theme.primary}}>⬇️</span>;
  };

  if (!isMounted) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: theme.textMedium, backgroundColor: theme.bgPage }}>Memuat Aplikasi...</div>;

  return (
    <main style={{ ...styles.pageContainer, backgroundColor: theme.bgPage, minHeight: "100vh" }}>
      
      {/* FORM CARD */}
      <div style={{ ...styles.card, maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "35px" }}>
          <div>
            <h1 style={{ color: theme.primary, fontSize: "2.2rem", margin: 0, fontWeight: "800", letterSpacing: "-0.5px" }}>🥗 Food Waste Tracker ♻️</h1>
            <p style={{ color: theme.textMedium, fontSize: "16px", margin: "8px 0 0 0", fontWeight: "500" }}>Sistem Pelacakan Limbah Dapur Terdesentralisasi</p>
          </div>
          <div style={{ transform: "scale(0.95)", transformOrigin: "top right" }}>
            <ConnectButton client={client} chain={chain} />
          </div>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
             <label style={styles.headingLabel}>⚖️ BERAT SAMPAH (GRAM)</label>
             <input type="number" value={weight} placeholder="Contoh: 2500" onChange={(e) => setWeight(e.target.value)} style={styles.input} />
             <div style={styles.helperText}>*Masukkan angka bulat dalam satuan <b>GRAM</b>. (Contoh: 1 Kg = input 1000).</div>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={styles.headingLabel}>📸 BUKTI FOTO {isCompressing && <span style={{color: theme.primary, fontSize: "12px"}}>(Memproses...)</span>}</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{...styles.input, padding: "10px"}} />
                {file && <div style={{fontSize: "13px", color: theme.success, marginTop: "8px", fontWeight: "500"}}>✅ Foto siap ({(file.size / 1024).toFixed(0)} KB)</div>}
            </div>
            <div style={{ flex: 1, minWidth: "250px" }}>
                <label style={styles.headingLabel}>📍 LOKASI DAPUR (GPS)</label>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input type="text" value={location} placeholder="Klik tombol LOKASI →" readOnly style={{...styles.input, backgroundColor: "#f1f5f9", color: theme.textLight, cursor: "not-allowed"}} />
                    <button onClick={handleGetLocation} style={{ padding: "0 24px", borderRadius: "12px", border: "none", backgroundColor: isLocating ? theme.textLight : theme.secondary, color: "white", fontWeight: "600", cursor: "pointer", transition: "background 0.2s" }}>
                        {isLocating ? "..." : "🗺️ LOKASI"}
                    </button>
                </div>
            </div>
          </div>
          
          <div>
            <label style={styles.headingLabel}>📝 CATATAN TAMBAHAN</label>
            <input type="text" value={notes} maxLength={MAX_NOTES_LENGTH} placeholder="Keterangan singkat (cth: Sisa menu siang)..." onChange={(e) => setNotes(e.target.value)} style={styles.input} />
            <div style={{ ...styles.helperText, textAlign: "right", color: notes.length >= MAX_NOTES_LENGTH ? theme.danger : theme.textLight }}>{notes.length} / {MAX_NOTES_LENGTH} Karakter</div>
          </div>
          
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={styles.headingLabel}>🏷️ JENIS LIMBAH</label>
                <select value={type} onChange={(e) => setType(e.target.value)} style={{...styles.input, appearance: "none" }}>
                    <option value="Organic">🌱 Organik (Sisa Makanan)</option>
                    <option value="Plastic">🛍️ Plastik / Kemasan</option>
                    <option value="Hazardous">☢️ B3 (Berbahaya)</option>
                </select>
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={styles.headingLabel}>🚚 TUJUAN PENGELOLAAN</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} style={{...styles.input, appearance: "none"}}>
                    <option value="Maggot Farm">🪰 Maggot Farm (Budidaya)</option>
                    <option value="Recycling Center">♻️ Pusat Daur Ulang</option>
                    <option value="Landfill">🚛 TPA (Tempat Pembuangan Akhir)</option>
                </select>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button onClick={handleReview} style={styles.buttonPrimary}>🔍 Review & Konfirmasi Data</button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ ...styles.card, width: "90%", maxWidth: "500px", padding: "30px", boxShadow: theme.shadowModal, border: "none" }}>
            <h2 style={{ margin: "0 0 20px 0", color: theme.textDark, textAlign: "center", fontWeight: "700" }}>⚠️ Konfirmasi Akhir</h2>
            <div style={{ backgroundColor: theme.bgInput, padding: "20px", borderRadius: "16px", marginBottom: "25px", fontSize: "15px", color: theme.textDark, border: `1px solid ${theme.border}` }}>
              <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}><span style={{color: theme.textMedium}}>⚖️ Berat:</span> <strong>{weight} Gram</strong></div>
              <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}><span style={{color: theme.textMedium}}>🏷️ Jenis:</span> <strong>{type}</strong></div>
              <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}><span style={{color: theme.textMedium}}>🚚 Tujuan:</span> <strong>{method}</strong></div>
              <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}><span style={{color: theme.textMedium}}>📍 Lokasi:</span> <strong style={{fontSize:"13px"}}>{location}</strong></div>
              <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}><span style={{color: theme.textMedium}}>📝 Catatan:</span> <strong>{notes || "-"}</strong></div>
              {file && (<div style={{ textAlign: "center", marginTop: "20px" }}><img src={URL.createObjectURL(file)} alt="Preview" style={{ maxHeight: "180px", borderRadius: "12px", border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }} /></div>)}
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "16px", borderRadius: "12px", border: `2px solid ${theme.border}`, backgroundColor: "white", color: theme.textMedium, fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}>Batal</button>
              <div style={{ flex: 1 }}>
                <TransactionButton
                  transaction={async () => {
                    const uri = await upload({ client, files: [file!] });
                    const weightToSend = Math.floor(Number(weight));
                    return prepareContractCall({ contract, method: "function submitWaste(uint256 _weight, string _type, string _method, string _imageUrl, string _notes, string _coordinates)", params: [BigInt(weightToSend), type, method, uri, notes, location] });
                  }}
                  onTransactionConfirmed={() => { alert("✅🔒DATA TERSIMPAN DI BLOCKCHAIN!"); setShowModal(false); setWeight(""); setNotes(""); setFile(null); setLocation(""); }}
                  onError={(error) => { console.error("Tx Error:", error); alert("Gagal: " + (error.message || "Cek console")); }}
                  style={styles.buttonPrimary}
                >Ya, Kirim Permanen</TransactionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TABLE */}
      <div style={{ marginTop: "60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h3 style={{ color: theme.textDark, fontFamily: "'Inter', sans-serif", fontSize: "1.8rem", margin: 0, fontWeight: "700" }}>📊 Riwayat Laporan</h3>
            <p style={{ color: theme.textMedium, margin: "5px 0 0 0", fontSize: "14px" }}>Data tersimpan transparan di Blockchain</p>
          </div>
          
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input 
              type="text" 
              placeholder="🔍 Cari ID, Jenis, Catatan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "12px 20px", borderRadius: "100px", border: `1px solid ${theme.border}`, width: "250px", outline: "none", fontSize: "14px", backgroundColor: theme.bgCard, boxShadow: theme.shadowCard }}
            />
            <button onClick={handleExportExcel} style={{ backgroundColor: theme.success, color: "white", padding: "10px 20px", borderRadius: "100px", border: "none", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgb(16 185 129 / 0.2)" }}>📄 Download Excel</button>
          </div>
        </div>

        <div style={{ backgroundColor: theme.bgCard, borderRadius: "20px", overflow: "hidden", boxShadow: theme.shadowCard, border: `1px solid ${theme.border}`, overflowX: "auto" }}>
          {loadingLogs ? ( <div style={{ padding: "40px", textAlign: "center", color: theme.textMedium, fontStyle: "italic" }}>Sedang memuat data dari blockchain...</div> ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead style={{ backgroundColor: "#f8fafc", borderBottom: `2px solid ${theme.border}` }}>
                  <tr>
                    <th onClick={() => requestSort('kitchenId')} style={{ cursor: "pointer", padding: "18px", textAlign: "left", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>ID DAPUR {getSortIcon('kitchenId')}</th>
                    <th onClick={() => requestSort('timestamp')} style={{ cursor: "pointer", padding: "18px", textAlign: "left", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>WAKTU {getSortIcon('timestamp')}</th>
                    <th style={{ padding: "18px", textAlign: "center", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>FOTO</th>
                    <th onClick={() => requestSort('weightInKg')} style={{ cursor: "pointer", padding: "18px", textAlign: "center", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>BERAT {getSortIcon('weightInKg')}</th>
                    <th style={{ padding: "18px", textAlign: "center", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>JENIS</th>
                    <th style={{ padding: "18px", textAlign: "center", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>PENGELOLAAN</th>
                    <th style={{ padding: "18px", textAlign: "left", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>KETERANGAN & LOKASI</th>
                    <th style={{ padding: "18px", textAlign: "right", color: theme.textMedium, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>BUKTI ONCHAIN</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((log, index) => {
                      const { dateStr, timeStr } = formatDate(log.timestamp);
                      const rawGrams = Number(log.weightInKg);
                      let typeColorBg = "#dcfce7"; let typeColorText = "#166534";
                      if (log.wasteType === "Plastic") { typeColorBg = "#fef9c3"; typeColorText = "#a16207"; } 
                      else if (log.wasteType === "Hazardous") { typeColorBg = "#fee2e2"; typeColorText = "#991b1b"; }

                      return (
                        <tr key={index} style={{ borderBottom: `1px solid ${theme.border}`, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "18px", verticalAlign: "middle", fontWeight: "600", color: theme.textDark, fontSize: "13px", fontFamily: "monospace" }}>👨‍🍳 {shortenAddress(log.kitchenId)}</td>
                          <td style={{ padding: "18px", verticalAlign: "middle" }}>
                             <div style={{ fontWeight: "600", color: theme.textDark, fontSize: "13px" }}>{dateStr}</div>
                             <div style={{ color: theme.textLight, fontSize: "12px", marginTop: "4px" }}>{timeStr}</div>
                          </td>
                          <td style={{ padding: "12px", verticalAlign: "middle", textAlign: "center" }}>
                            <div style={{ width: "60px", height: "60px", borderRadius: "10px", overflow: "hidden", border: `2px solid ${theme.border}`, margin: "0 auto", cursor: "pointer", boxShadow: theme.shadowCard }} onClick={() => window.open(log.imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/"), "_blank")}>
                                <MediaRenderer client={client} src={log.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          </td>
                          <td style={{ padding: "18px", textAlign: "center", fontWeight: "700", color: theme.primaryDark, fontSize: "15px" }}>{rawGrams.toLocaleString()} g</td>
                          <td style={{ padding: "18px", textAlign: "center", verticalAlign: "middle" }}>
                             <span style={{ ...styles.badge, backgroundColor: typeColorBg, color: typeColorText }}>{log.wasteType}</span>
                          </td>
                          <td style={{ padding: "18px", textAlign: "center", verticalAlign: "middle" }}>
                             <span style={{ ...styles.badge, backgroundColor: theme.bgInput, color: theme.textMedium, border: `1px solid ${theme.border}` }}>{log.disposalMethod}</span>
                          </td>
                          <td style={{ padding: "18px", verticalAlign: "middle" }}>
                            {log.notes ? <div style={{ fontSize: "13px", color: theme.textMedium, fontStyle: "italic", marginBottom: "8px" }}>“{log.notes}”</div> : <div style={{ fontSize: "13px", color: theme.textLight }}>-</div>}
                            {log.coordinates && (<a href={`http://googleusercontent.com/maps.google.com/?q=${log.coordinates}`} target="_blank" style={{ fontSize: "12px", color: theme.primary, textDecoration: "none", fontWeight: "700", display: "inline-flex", alignItems: "center", backgroundColor: "#e0f2fe", padding: "4px 10px", borderRadius: "20px" }}>🗺️ Lihat Peta</a>)}
                          </td>
                          <td style={{ padding: "18px", textAlign: "right", verticalAlign: "middle" }}>
                            <a href={`https://amoy.polygonscan.com/address/${log.kitchenId}`} target="_blank" style={{ color: theme.primary, textDecoration: "none", fontWeight: "700", fontSize: "12px", border: `1px solid ${theme.primary}`, padding: "6px 12px", borderRadius: "100px", display: "inline-block", transition: "all 0.2s" }} onMouseOver={(e) => {e.currentTarget.style.background = theme.primary; e.currentTarget.style.color = "white"}} onMouseOut={(e) => {e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.primary}}>🔗 Explorer</a>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: theme.textLight }}>
                        <div style={{ fontSize: "24px", marginBottom: "10px" }}>📭</div>
                        Tidak ada data laporan yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* PAGINATION CONTROLS */}
              {processedLogs.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderTop: `1px solid ${theme.border}`, backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: theme.textMedium }}>
                    <span>Tampilkan:</span>
                    <select 
                      value={itemsPerPage} 
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      style={{ padding: "6px", borderRadius: "8px", border: `1px solid ${theme.border}`, outline: "none" }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>dari {processedLogs.length} data</span>
                  </div>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <button onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, backgroundColor: currentPage === 1 ? "#f1f5f9" : "white", color: currentPage === 1 ? theme.textLight : theme.textDark, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>⬅️ Prev</button>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: theme.textDark, padding: "0 10px" }}>Hal {currentPage} dari {totalPages}</span>
                    <button onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, backgroundColor: currentPage === totalPages ? "#f1f5f9" : "white", color: currentPage === totalPages ? theme.textLight : theme.textDark, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next ➡️</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div style={{ marginTop: "80px", textAlign: "center", color: theme.textLight, fontSize: "13px", fontWeight: "500" }}>
        Built on Polygon & IPFS · Copyright © Farhan Fadilla / Terra Horizon 2025
      </div>
    </main>
  );
}