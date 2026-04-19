import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OrderStatusTimeline,
  sourceNames,
  statusStyles,
} from "../orders/_components/orders-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderWithRelations } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currency";

export const OrderDetailsModal = ({
  order,
  isOpen,
  onClose,
}: {
  order: OrderWithRelations;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const totalAmount = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - {order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
              {order.customerWhatsapp && (
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{order.customerWhatsapp}</p>
                </div>
              )}
              {/*<div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{order.customerEmail || "N/A"}</p>
              </div>*/}
            </div>
          </div>

          {/* Order Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline" className={statusStyles[order.status]}>
                  {order.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{sourceNames[order.source]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {order.city}, {order.state}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
              {order.assignedTo && (
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{order.assignedTo.name}</p>
                </div>
              )}
              {order.agent && (
                <div>
                  <p className="text-sm text-muted-foreground">Agent</p>
                  <p className="font-medium">{order.agent.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Delivery Address</h3>
            <p className="text-sm">{order.deliveryAddress}</p>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Order Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {getCurrencySymbol(order.currency)}{item.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {getCurrencySymbol(order.currency)}{(item.quantity * item.price).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold">
                      Total Amount
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {getCurrencySymbol(order.currency)}{totalAmount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/*Status Timeline*/}
          <OrderStatusTimeline order={order} />
          {/* Notes */}
          {order.notes && order.notes.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Notes</h3>
              <div className="space-y-2">
                {order.notes.map((note) => (
                  <div
                    key={note.id}
                    className="text-sm bg-muted p-3 rounded-lg"
                  >
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      {format(new Date(note.createdAt), "MMM dd, yyyy HH:mm")}
                    </p>
                    <p>{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
