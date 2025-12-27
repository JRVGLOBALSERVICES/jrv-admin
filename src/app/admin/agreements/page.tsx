"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MobileCardList } from "@/components/ui/ResponsiveList";
import { TableShell, Table, Th, Td } from "@/components/ui/Table";

type AgreementRow = {
  id: string;
  customer_name?: string | null;
  mobile?: string | null;
  number_plate?: string | null;
  car_type?: string | null;
  status?: string | null;
  agreement_url?: string | null;
  whatsapp_url?: string | null;
};

export default function AgreementsPage() {
  // DEMO data (swap with Supabase fetch later)
  const [rows] = useState<AgreementRow[]>([
    {
      id: "1",
      customer_name: "Customer A",
      mobile: "+6011xxxxxxx",
      number_plate: "QM 3600 N",
      car_type: "Toyota Vios",
      status: "Edited",
      agreement_url: "https://example.com/agreement.jpg",
      whatsapp_url:
        "https://api.whatsapp.com/send?phone=6011xxxxxxx&text=Hello",
    },
    {
      id: "2",
      customer_name: "Customer B",
      mobile: "+6012xxxxxxx",
      number_plate: "ABC 1234",
      car_type: "Perodua Axia",
      status: "Created",
      agreement_url: null,
      whatsapp_url: null,
    },
  ]);

  const items = useMemo(() => rows, [rows]);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Agreements</h1>
          <p className="text-sm opacity-70">Mobile cards + desktop table.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => setOpen(true)}
          >
            Filters
          </Button>
          <Button className="w-full sm:w-auto">Export</Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Search by customer / mobile / plate..."
          />
          <Button className="w-full sm:w-auto">Search</Button>
        </div>
      </Card>

      {/* Mobile: Cards */}
      <div className="sm:hidden">
        <MobileCardList
          items={items}
          getKey={(r) => r.id}
          renderTitle={(r) => r.customer_name ?? "Unknown customer"}
          renderMeta={(r) => (
            <div className="space-y-1">
              <div>📱 {r.mobile ?? "-"}</div>
              <div>
                🚗 {r.car_type ?? "-"} • {r.number_plate ?? "-"}
              </div>
              <div className="text-xs opacity-70">
                Status: {r.status ?? "-"}
              </div>
            </div>
          )}
          renderRight={(r) => (
            <div className="flex flex-col gap-2 w-[110px]">
              <a href={r.agreement_url ?? "#"} target="_blank" rel="noreferrer">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={!r.agreement_url}
                >
                  View
                </Button>
              </a>
              <a href={r.whatsapp_url ?? "#"} target="_blank" rel="noreferrer">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  disabled={!r.whatsapp_url}
                >
                  WhatsApp
                </Button>
              </a>
            </div>
          )}
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden sm:block">
        <TableShell>
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Mobile</Th>
                <Th>Car</Th>
                <Th>Plate</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <Td>{r.customer_name ?? "-"}</Td>
                  <Td>{r.mobile ?? "-"}</Td>
                  <Td>{r.car_type ?? "-"}</Td>
                  <Td>{r.number_plate ?? "-"}</Td>
                  <Td>{r.status ?? "-"}</Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-2">
                      <a
                        href={r.agreement_url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!r.agreement_url}
                        >
                          View
                        </Button>
                      </a>
                      <a
                        href={r.whatsapp_url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!r.whatsapp_url}
                        >
                          WhatsApp
                        </Button>
                      </a>
                      <Button size="sm" variant="danger" sound="off">
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableShell>
      </div>

      <Modal
        open={open}
        title="Filters"
        description="Example modal, mobile friendly"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Customer name..."
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Plate number..."
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Mobile..."
          />
        </div>
      </Modal>
    </div>
  );
}
