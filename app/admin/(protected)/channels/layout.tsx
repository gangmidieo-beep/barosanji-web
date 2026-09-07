import ChannelTabs from "@/components/admin/channels/ChannelTabs";

export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ChannelTabs />
      {children}
    </div>
  );
}
