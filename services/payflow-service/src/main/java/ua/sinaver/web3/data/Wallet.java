package ua.sinaver.web3.data;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@Entity
@Table(uniqueConstraints = { @UniqueConstraint(columnNames = { "network", "address" }) })
public class Wallet {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    @Column
    private String address;

    @Column
    private String network;

    @Column(columnDefinition = "boolean")
    private boolean smart;

    @Column(columnDefinition = "boolean")
    private boolean safe;

    @Column
    private String safeVersion;

    @Column
    private String safeSaltNonce;

    @Column(columnDefinition = "boolean")
    private boolean safeDeployed;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "flow_id", nullable = false)
    private Flow flow;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "account_id", nullable = true)
    private Account master;

    @Version
    private Long version;

    public Wallet(String address, String network, boolean smart, boolean safe, String safeVersion, String safeSaltNonce,
            boolean safeDeployed) {
        this.address = address;
        this.network = network;
        this.smart = smart;
        this.safe = safe;
        this.safeVersion = safeVersion;
        this.safeSaltNonce = safeSaltNonce;
        this.safeDeployed = safeDeployed;
    }

    @Override
    public String toString() {
        return "Wallet [id=" + id + ", address=" + address + ", network=" + network + ", smart=" + smart + ", safe="
                + safe + ", safeVersion="
                + safeVersion + ", safeDeployed="
                + safeDeployed + ", flow="
                + flow.getUuid() + ", master="
                + (master != null ? master.getAddress() : "null") + "]";
    }
}
